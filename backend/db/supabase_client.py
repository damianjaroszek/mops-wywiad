"""
Klient Supabase — singleton z lazy initialization
Używa service_role key → dostęp do wszystkich tabel (omija RLS)
"""
import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

_client: Client | None = None


def get_supabase() -> Client:
    """Zwraca singleton klienta Supabase. Tworzy przy pierwszym wywołaniu."""
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL", "").strip()
        key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()

        if not url or url == "https://TWOJ_PROJEKT.supabase.co":
            raise RuntimeError(
                "❌ Brak SUPABASE_URL w .env! Skopiuj .env.example → .env i uzupełnij."
            )
        if not key or key.startswith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."):
            raise RuntimeError(
                "❌ Brak SUPABASE_SERVICE_KEY w .env! "
                "Znajdź w Supabase → Settings → API → service_role."
            )

        _client = create_client(url, key)
        logger.info(f"✅ Połączono z Supabase: {url[:40]}...")

    return _client
