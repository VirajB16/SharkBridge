from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import re
import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

class AssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User's query")
    role: Optional[str] = Field("entrepreneur", description="User role: entrepreneur, investor, or guest")
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list)

class AssistantChatResponse(BaseModel):
    reply: str
    suggested_actions: Optional[List[str]] = Field(default_factory=list)

PLATFORM_SYSTEM_PROMPT = """You are SharkBot, the official AI Guide & Personal Assistant for SharkBridge.
SharkBridge is an AI-powered, transparent small-business (SME) funding platform tailored specifically for India's startup ecosystem.
You have comprehensive, authoritative knowledge of the entire website and guide entrepreneurs and investors step-by-step.

KEY PLATFORM KNOWLEDGE:
1. PLATFORM OVERVIEW:
   - Currency: All amounts are in Indian Rupees (₹ / INR).
   - Role separation: Users register either as an 'Entrepreneur' or an 'Investor'.
   - Core philosophy: Transparent, deterministic matching, verified investor credentials via OCR, and end-to-end encrypted deal rooms.

2. ENTREPRENEUR WORKFLOW:
   - Registration: Sign up with Full Name, Email, and Password. (CV is NOT required during registration).
   - Creating Business Profile:
     * Mandatory fields marked with (*): Business Name, Sector, Stage, Location, Monthly Revenue (₹), Monthly Expenses (₹), Growth Plan.
     * Optional fields: Official Website URL, GSTIN (Goods and Services Tax Identification Number).
     * Allowed Business Stages: Idea, Prototype, Early Growth, Mature (Note: 'Scaling' was removed).
   - Finding & Matching Investors:
     * Explainable 100-point deterministic match rubric:
       - Sector Alignment: 35 points
       - Stage Alignment: 25 points
       - Ticket Size Fit: 20 points
       - Geographic Focus: 10 points
       - Financial Health (EBITDA margin & Debt-to-Revenue): 10 points
     * Entrepreneurs can inspect the detailed score breakdown for each investor.
     * Entrepreneurs can view verified investor CVs before applying.
   - Submitting Funding Applications:
     * Mandatory fields (*): Target Investor, Amount Requested (₹), Intended Use of Funds, Growth Strategy & Milestones, Confirmation checkbox.
     * Equity Stake Offered (%): Optional field specifying what equity percentage you are offering for the requested funds.
     * Note: 'Additional Notes' was removed from the application form.
   - AI Executive Summary: Automatically generated from submitted financials and business details; highlights missing information gaps for investors.

3. INVESTOR WORKFLOW:
   - Registration: Sign up with Full Name, Email, and Password.
   - Investor Dashboard: Shows live metrics (Pending Evaluation, Marked Interested, Total Incoming), Incoming Funding Applications, and Matched SME Deal Flow pipeline.
   - Verified CV Upload & OCR Technology:
     * Upload CV just once after registering on the Investor Dashboard.
     * Automated OCR technology parses the document, verifies investment credentials, extracts target sectors, ticket size range, and years of experience.
     * Once uploaded, it is permanently saved in the investor's profile so entrepreneurs can verify their credentials. It never asks again!
   - Investment Thesis / Criteria:
     * Target Sectors (*), Maximum Ticket Size in INR (*), Preferred Stages (*), Geographic Focus (optional).
     * Note: Minimum Ticket Size was removed to maximize deal pipeline opportunities.
   - Reviewing Applications:
     * Review AI Executive Summaries and financial health metrics.
     * Status options: Under Review, Request Information, Mark Interested (Accept), Decline.

4. DEAL PLANNING CHAT ROOM:
   - When an investor marks an application as 'Interested' (Accepted), a dedicated, direct deal planning chat unlocks for both the entrepreneur and investor.
   - Every chat header prominently displays: 'Certified by SharkBridge, end-to-end encryption' (like WhatsApp security headers).
   - Allows coordinating term sheets, due diligence, and deal structuring directly.

Provide courteous, clear, formatted responses (with bolding, bullets, and steps where helpful). Never make up fictional rules.
"""

def generate_deterministic_assistant_reply(message: str, role: str) -> Dict[str, Any]:
    """
    Rich deterministic knowledge-base fallback when external LLM is offline or unconfigured.
    Answers any question about SharkBridge with precision.
    """
    msg = message.lower().strip()

    # 1. Registration & CV Upload
    if "cv" in msg or "resume" in msg or "upload" in msg or "registration" in msg or "signup" in msg:
        if "ocr" in msg or "technology" in msg or "verify" in msg:
            return {
                "reply": (
                    "**Automated OCR Credential Verification on SharkBridge:**\n\n"
                    "1. **When to Upload:** CV upload is not required during initial signup! You only need to upload your CV **once** from your **Investor Dashboard**.\n"
                    "2. **OCR Extraction:** When you upload your CV (PDF, DOC, or DOCX), SharkBridge runs automated **OCR text extraction & semantic parsing**.\n"
                    "3. **Extracted Insights:** The system automatically verifies your years of investment experience, target sectors (e.g. AgriTech, FinTech, Clean Energy), and investment ticket ranges.\n"
                    "4. **Permanent Storage:** Once uploaded and verified, your credentials are saved permanently in Supabase Storage and your profile. You will never be prompted to upload again across reloads!\n"
                    "5. **Entrepreneur Trust:** Entrepreneurs can view your verified credentials before pitching, ensuring high-quality, credible deal flow."
                ),
                "suggested_actions": ["How do I set investment criteria?", "How does matching work?", "Tell me about deal chat"]
            }
        return {
            "reply": (
                "**SharkBridge Registration & Profile Guide:**\n\n"
                "- **Sign Up:** Create an account by choosing your role (**Entrepreneur** or **Investor**) and entering your Full Name, Email, and Password.\n"
                "- **CV Upload:** You do **not** need a CV during registration! Investors upload their CV once on their dashboard where automated OCR technology verifies credentials permanently.\n"
                "- **Authentication:** Accounts are secured via Supabase Auth with role-based access control."
            ),
            "suggested_actions": ["How do I create a business profile?", "How does investor OCR work?", "How do I apply for funding?"]
        }

    # 2. Business Profile Creation & Stages
    if "business" in msg or "stage" in msg or "gstin" in msg or "create profile" in msg:
        return {
            "reply": (
                "**Creating Your SME Business Profile:**\n\n"
                "To connect with investors and receive an explainable match score, fill out your business profile:\n\n"
                "• **Mandatory Fields (*):**\n"
                "  - Business Name (*)\n"
                "  - Sector / Industry (*)\n"
                "  - Business Stage (*): **Idea**, **Prototype**, **Early Growth**, or **Mature** (Note: *Scaling* was removed)\n"
                "  - Location (*)\n"
                "  - Monthly Revenue in INR (*)\n"
                "  - Monthly Expenses in INR (*)\n"
                "  - Growth Plan & Milestones (*)\n\n"
                "• **Optional Fields:**\n"
                "  - Official Website URL\n"
                "  - **GSTIN** (Goods and Services Tax Identification Number) for verified SME credentials.\n\n"
                "Once saved, your business is instantly matched against investor criteria!"
            ),
            "suggested_actions": ["How does the matching score work?", "How do I apply to an investor?", "What is equity stake %?"]
        }

    # 3. Matching Algorithm & 100-Point Rubric
    if "match" in msg or "score" in msg or "algorithm" in msg or "rubric" in msg or "percentage" in msg:
        return {
            "reply": (
                "**How the 100-Point SharkBridge Matching Algorithm Works:**\n\n"
                "SharkBridge uses a transparent, explainable deterministic matching rubric (no black-box bias):\n\n"
                "1. **Sector Alignment (35 points):** Evaluates whether the SME's sector matches the investor's designated focus industries.\n"
                "2. **Stage Alignment (25 points):** Matches the business development stage (Idea, Prototype, Early Growth, Mature) with preferred stages.\n"
                "3. **Ticket Size Fit (20 points):** Checks if the funding requested fits within the investor's Maximum Ticket Size limit.\n"
                "4. **Geographic Proximity (10 points):** Rewards matching state or pan-India geographic focus.\n"
                "5. **Financial Health (10 points):** Evaluates EBITDA margins and debt-to-revenue ratio for operational sustainability.\n\n"
                "Scores of **70%+** represent high compatibility, and each match includes an itemized explanation of why you fit together!"
            ),
            "suggested_actions": ["How do I apply for funding?", "Tell me about investor CVs", "What is Deal Planning Chat?"]
        }

    # 4. Applying for Funding & Equity Stake
    if "apply" in msg or "funding" in msg or "equity" in msg or "proposal" in msg or "capital" in msg:
        return {
            "reply": (
                "**Applying for Funding on SharkBridge:**\n\n"
                "1. **Select an Investor:** Browse your matched investors list and review their investment thesis and verified CV.\n"
                "2. **Funding Proposal Details:**\n"
                "   - **Target Investor (*):** The investor you are pitching to.\n"
                "   - **Amount Requested in INR (*):** Capital required for your next growth milestone.\n"
                "   - **Equity Stake Offered (%):** The optional percentage of company equity you are willing to dilute for this investment.\n"
                "   - **Use of Funds (*):** Concrete allocation (e.g. equipment purchase, hiring, inventory).\n"
                "   - **Growth Plan & Milestones (*):** Projections and timelines.\n"
                "3. **AI Executive Summary:** Upon submission, SharkBridge automatically compiles an objective executive briefing for the investor, highlighting your key strengths and any information gaps.\n"
                "4. **Status Updates:** Track your proposal across Submitted, Under Review, and Interested statuses!"
            ),
            "suggested_actions": ["What happens after an investor accepts?", "Tell me about deal chat", "How do I edit my business?"]
        }

    # 5. Deal Planning Chat & Encryption
    if "chat" in msg or "message" in msg or "accepted" in msg or "interested" in msg or "whatsapp" in msg or "encrypt" in msg:
        return {
            "reply": (
                "**Direct Deal Planning Chat (Unlocked on Acceptance):**\n\n"
                "• **How it Unlocks:** When an investor reviews your proposal and marks it as **'Interested' (Accepted)**, the deal planning chat room automatically becomes active for both parties!\n"
                "• **Security Banner:** Just like WhatsApp, the header of every deal chat displays:\n"
                "  `🔒 Certified by SharkBridge, end-to-end encryption`\n"
                "• **Features:**\n"
                "  - Direct messaging between founder and target investor.\n"
                "  - View proposal snapshot: Requested capital in INR and Equity Stake % offered.\n"
                "  - Coordinate due diligence documents, valuation discussions, and terms seamlessly."
            ),
            "suggested_actions": ["How does an investor mark interested?", "How do I find investors?", "What are the allowed stages?"]
        }

    # 6. Investor Criteria & Thesis
    if "thesis" in msg or "criteria" in msg or "ticket" in msg or "investor dashboard" in msg:
        return {
            "reply": (
                "**Setting Investment Criteria as an Investor:**\n\n"
                "1. Click **'Set Investment Criteria'** on your Investor Dashboard.\n"
                "2. Specify your preferences:\n"
                "   - **Target Sectors (*):** Industries you actively fund (e.g. AgriTech, Clean Energy, Logistics).\n"
                "   - **Maximum Ticket Size in INR (*):** Upper limit of capital deployed per deal (Minimum ticket size was removed to maximize deal pipeline opportunities).\n"
                "   - **Preferred Stages (*):** Stages open to backing (Idea, Prototype, Early Growth, Mature).\n"
                "   - **Geographic Focus:** Preferred regions or Pan-India.\n"
                "3. **Live SME Deal Flow:** Your dashboard displays matched SME deals matching your thesis, ranked by match percentage."
            ),
            "suggested_actions": ["How do I upload my CV?", "Tell me about OCR verification", "How do I accept an application?"]
        }

    # 7. Default / Welcome Overview
    return {
        "reply": (
            "**Welcome to SharkBridge Personal Guide!**\n\n"
            "I am your platform assistant, ready to help you navigate SharkBridge. Here are key things I can assist you with:\n\n"
            "• **For Entrepreneurs:**\n"
            "  - Creating your business profile with optional GSTIN.\n"
            "  - Understanding the 4 business stages: Idea, Prototype, Early Growth, Mature.\n"
            "  - Submitting funding requests with Equity Stake Offered (%).\n"
            "  - Reviewing verified investor CVs.\n\n"
            "• **For Investors:**\n"
            "  - Uploading your CV once with automated OCR credential verification.\n"
            "  - Setting your Maximum Ticket Size and Target Sectors.\n"
            "  - Reviewing incoming proposals and matched SME deal flow.\n\n"
            "• **Deal Rooms:**\n"
            "  - Direct deal planning chat with **Certified by SharkBridge, end-to-end encryption** when an application is accepted.\n\n"
            "What would you like assistance with right now?"
        ),
        "suggested_actions": [
            "How do I create a business profile?",
            "How does investor matching work?",
            "How does CV OCR verification work?",
            "How does deal planning chat work?"
        ]
    }

@router.post("/assistant/chat", response_model=AssistantChatResponse, tags=["Assistant"])
async def assistant_chat(req: AssistantChatRequest):
    """
    SharkBridge Personal Assistant chatbot.
    Answers queries about platform workflows, matching rubric, business creation,
    OCR credential verification, and deal rooms with comprehensive site knowledge.
    """
    # If external LLM key is configured, query Gemini with platform prompt
    if settings.LLM_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.LLM_MODEL}:generateContent?key={settings.LLM_API_KEY}"
            user_content = f"User Role: {req.role}\nUser Query: {req.message}"
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": f"{PLATFORM_SYSTEM_PROMPT}\n\n{user_content}"}]}
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 800
                }
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text_part = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text_part:
                            return AssistantChatResponse(
                                reply=text_part.strip(),
                                suggested_actions=[
                                    "How does matching score work?",
                                    "Tell me about deal chat",
                                    "How does investor CV OCR work?"
                                ]
                            )
        except Exception as e:
            logger.debug(f"LLM assistant exception, falling back: {e}")

    # Fallback to high-quality deterministic platform knowledge engine
    res = generate_deterministic_assistant_reply(req.message, req.role or "entrepreneur")
    return AssistantChatResponse(**res)
