from supabase import create_client, Client
from app.core.config import settings
from functools import lru_cache

@lru_cache()
def get_supabase_client() -> Client:
    """
    Returns a cached Supabase client initialized with URL and Anon key.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be configured")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

@lru_cache()
def get_supabase_admin_client() -> Client:
    """
    Returns a cached Supabase admin client with service_role key.
    Used exclusively on the server for secure operations.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

import re
import logging
logger = logging.getLogger(__name__)

def safe_supabase_insert(table_name: str, record: dict) -> list:
    """
    Inserts a record into Supabase. If Supabase Postgres raises column does not exist (42703)
    or PostgREST schema cache error (PGRST204), it dynamically strips the missing column
    and retries, ensuring schema backward compatibility.
    """
    admin_sb = get_supabase_admin_client()
    payload = dict(record)
    for _ in range(5):
        try:
            res = admin_sb.table(table_name).insert(payload).execute()
            return res.data or []
        except Exception as e:
            err_msg = str(e)
            match_postgrest = re.search(r"Could not find the '([a-zA-Z0-9_]+)' column", err_msg)
            match_postgres = re.search(r"column [a-zA-Z0-9_.]*['\"]?([a-zA-Z0-9_]+)['\"]? does not exist", err_msg, re.IGNORECASE)

            missing_col = None
            if match_postgrest:
                missing_col = match_postgrest.group(1)
            elif match_postgres:
                missing_col = match_postgres.group(1)

            if missing_col and missing_col in payload:
                logger.warning(f"Column '{missing_col}' does not exist on '{table_name}'. Stripping and retrying insert.")
                del payload[missing_col]
                continue
            raise e
    return []

def safe_supabase_update(table_name: str, updates: dict, match_col: str, match_val: str) -> list:
    admin_sb = get_supabase_admin_client()
    payload = dict(updates)
    for _ in range(5):
        try:
            res = admin_sb.table(table_name).update(payload).eq(match_col, match_val).execute()
            return res.data or []
        except Exception as e:
            err_msg = str(e)
            match_postgrest = re.search(r"Could not find the '([a-zA-Z0-9_]+)' column", err_msg)
            match_postgres = re.search(r"column [a-zA-Z0-9_.]*['\"]?([a-zA-Z0-9_]+)['\"]? does not exist", err_msg, re.IGNORECASE)

            missing_col = None
            if match_postgrest:
                missing_col = match_postgrest.group(1)
            elif match_postgres:
                missing_col = match_postgres.group(1)

            if missing_col and missing_col in payload:
                logger.warning(f"Column '{missing_col}' does not exist on '{table_name}'. Stripping and retrying update.")
                del payload[missing_col]
                continue
            raise e
    return []

