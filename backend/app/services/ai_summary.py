import httpx
import json
import logging
from typing import Dict, Any, Tuple, List
from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an objective, factual financial summarization assistant for SharkBridge.
Your job is to produce a concise executive briefing and highlight missing information from small-business funding applications for prospective investors.

STRICT RULES:
1. Base the summary ONLY on the explicitly provided facts.
2. DO NOT fabricate, estimate, extrapolate, or hallucinate metrics, customers, market size, or revenue.
3. If financial numbers (e.g., revenue or expenses) are omitted or not provided, explicitly write "Not provided".
4. Never state or imply that the business is guaranteed to succeed or that investment is guaranteed.
5. Clearly distinguish entrepreneur-reported claims from verified figures.
6. Identify key missing pieces of information that an investor would naturally ask for.

You must respond in strict JSON format:
{
  "summary": "Concise 2-3 paragraph objective briefing of the business, its stage, funding amount requested in INR, intended use of funds, and growth milestones.",
  "missing_information": [
    "List of specific omitted details (e.g. 'Monthly revenue not provided', 'Specific unit economics not detailed', etc.)"
  ],
  "review_questions": [
    "2-3 factual questions an investor should ask the entrepreneur during review"
  ]
}
"""

def generate_extractive_fallback(
    business: Dict[str, Any],
    application: Dict[str, Any]
) -> Tuple[str, Dict[str, Any]]:
    """
    Deterministically generates a safe extractive fallback summary when the
    external LLM service is busy, offline, or times out.
    Zero fabricated metrics. Clearly labeled as an extractive fallback.
    """
    biz_name = business.get("name", "Unnamed Business")
    sector = business.get("sector", "Unspecified Sector")
    stage = business.get("stage", "Unspecified Stage")
    desc = business.get("description", "No description provided.")
    location = business.get("location") or "Not provided"
    
    rev = business.get("monthly_revenue_inr")
    rev_str = f"₹{rev:,.0f}/month" if rev is not None else "Not provided"
    
    exp = business.get("monthly_expenses_inr")
    exp_str = f"₹{exp:,.0f}/month" if exp is not None else "Not provided"

    amt = application.get("amount_requested_inr", 0)
    use_funds = application.get("use_of_funds", "No use of funds specified.")
    growth = application.get("growth_plan") or business.get("growth_plan") or "No growth plan provided."

    missing: List[str] = []
    if rev is None:
        missing.append("Monthly revenue was not reported in the application.")
    if exp is None:
        missing.append("Monthly operating expenses were not reported.")
    if not business.get("target_customers"):
        missing.append("Target customer demographic details are omitted.")
    if not business.get("location"):
        missing.append("Geographic operating location was not specified.")
    if not business.get("website_url"):
        missing.append("Public website or social verification link not provided.")

    questions: List[str] = [
        "What are the direct breakdown items for the requested capital?",
        "What is the projected timeline to achieve milestones outlined in the growth plan?",
    ]
    if rev is None:
        questions.append("Can the entrepreneur share current cashflow or sales pipeline figures?")

    summary = (
        f"[Extractive Fallback Summary — Generated from submitted data without LLM]\n\n"
        f"**Business Overview:** {biz_name} operates in the {sector} sector at the '{stage}' development stage. "
        f"Location: {location}. Core focus: {desc}\n\n"
        f"**Funding Request & Use:** The entrepreneur has requested ₹{amt:,.0f} in capital. "
        f"Intended deployment: {use_funds}\n\n"
        f"**Reported Financials:** Monthly Revenue: {rev_str} | Monthly Operating Expenses: {exp_str}.\n\n"
        f"**Growth Strategy:** {growth}"
    )

    metadata = {
        "missing_fields": missing,
        "questions": questions,
        "is_fallback": True,
        "model_used": "extractive-fallback-v1"
    }

    return summary, metadata

async def generate_ai_summary(
    business: Dict[str, Any],
    application: Dict[str, Any]
) -> Tuple[str, Dict[str, Any]]:
    """
    Calls Google Gemini to generate an AI summary strictly grounded on supplied facts.
    If the API is busy or unconfigured, safely degrades to the extractive fallback.
    """
    if not settings.LLM_API_KEY:
        logger.info("LLM_API_KEY not set. Using extractive fallback.")
        return generate_extractive_fallback(business, application)

    # Prepare factual context
    context = {
        "business_name": business.get("name"),
        "sector": business.get("sector"),
        "stage": business.get("stage"),
        "description": business.get("description"),
        "location": business.get("location") or "Not provided",
        "target_customers": business.get("target_customers") or "Not provided",
        "monthly_revenue_inr": business.get("monthly_revenue_inr") if business.get("monthly_revenue_inr") is not None else "Not provided",
        "monthly_expenses_inr": business.get("monthly_expenses_inr") if business.get("monthly_expenses_inr") is not None else "Not provided",
        "growth_plan": application.get("growth_plan") or business.get("growth_plan") or "Not provided",
        "amount_requested_inr": application.get("amount_requested_inr"),
        "use_of_funds": application.get("use_of_funds"),
        "additional_notes": application.get("additional_notes") or "None",
    }

    user_prompt = f"Please summarize this funding application following all strict guidelines:\n{json.dumps(context, indent=2)}"

    # Try models in order: configured model, gemini-3.5-flash, gemini-flash-latest, gemini-3.8-flash
    candidate_models = [settings.LLM_MODEL, "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.8-flash"]
    # Deduplicate while preserving order
    seen = set()
    models = [m for m in candidate_models if not (m in seen or seen.add(m))]

    for model in models:
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.LLM_API_KEY}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{SYSTEM_PROMPT}\n\n{user_prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json"
            }
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(endpoint, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        raw_text = candidates[0]["content"]["parts"][0]["text"].strip()
                        # Parse JSON from model
                        try:
                            parsed = json.loads(raw_text)
                            summary_text = parsed.get("summary", "")
                            missing_info = {
                                "missing_fields": parsed.get("missing_information", []),
                                "questions": parsed.get("review_questions", []),
                                "is_fallback": False,
                                "model_used": model,
                            }
                            return summary_text, missing_info
                        except json.JSONDecodeError:
                            return raw_text, {
                                "missing_fields": [],
                                "questions": [],
                                "is_fallback": False,
                                "model_used": model
                            }
                else:
                    logger.warning(f"Model {model} returned status {res.status_code}: {res.text[:120]}")
        except Exception as e:
            logger.warning(f"Error calling model {model}: {e}")

    # If all LLM attempts timed out or returned 503, use extractive fallback
    logger.info("Falling back to safe extractive summary.")
    return generate_extractive_fallback(business, application)

