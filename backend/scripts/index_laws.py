"""
Skrypt jednorazowego indeksowania ustaw w Supabase pgvector.

Użycie:
  1. Pobierz teksty ustaw z https://isap.sejm.gov.pl/ jako pliki .txt
  2. Umieść w folderze backend/laws_texts/
  3. Uruchom: python scripts/index_laws.py

Koszt: ~$0.02 za całość (OpenAI text-embedding-3-small)
"""
import os, re, sys, time
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv(Path(__file__).parent.parent / ".env")

from openai import OpenAI
from db.supabase_client import get_supabase

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase = get_supabase()

LAWS_CONFIG = [
    {"filename": "ustawa_pomoc_spoleczna.txt", "title": "Ustawa z dnia 12 marca 2004 r. o pomocy społecznej", "short_name": "u.p.s.", "journal": "Dz.U. 2023 poz. 901"},
    {"filename": "rozporzadzenie_wywiad.txt", "title": "Rozporządzenie MPRiPS z dnia 25 sierpnia 2016 r. w sprawie rodzinnego wywiadu środowiskowego", "short_name": "r.w.ś.", "journal": "Dz.U. 2017 poz. 1788"},
    {"filename": "ustawa_swiadczenia_rodzinne.txt", "title": "Ustawa z dnia 28 listopada 2003 r. o świadczeniach rodzinnych", "short_name": "u.ś.r.", "journal": "Dz.U. 2024 poz. 323"},
    {"filename": "ustawa_wspieranie_rodziny.txt", "title": "Ustawa z dnia 9 czerwca 2011 r. o wspieraniu rodziny", "short_name": "u.w.r.", "journal": "Dz.U. 2024 poz. 177"},
]

LAWS_DIR = Path(__file__).parent.parent / "laws_texts"
CHUNK_SIZE, CHUNK_OVERLAP, BATCH_SIZE = 800, 150, 50


def extract_articles(text):
    pattern = re.compile(r'(Art\.\s*\d+[a-z]?\..*?)(?=Art\.\s*\d+[a-z]?\.|\Z)', re.DOTALL | re.IGNORECASE)
    articles = pattern.findall(text)
    if not articles:
        return chunk_text(text)
    result = []
    for a in articles:
        a = a.strip()
        if len(a) < 50: continue
        num = re.match(r'Art\.\s*(\d+[a-z]?)\.', a)
        article_number = f"Art. {num.group(1)}" if num else None
        title_match = re.search(r'\(([^)]{5,80})\)', a[:200])
        article_title = title_match.group(1) if title_match else None
        if len(a) > CHUNK_SIZE * 2:
            result.extend(chunk_text(a, article_number, article_title))
        else:
            result.append({"article_number": article_number, "article_title": article_title, "content": a[:3000], "chunk_index": 0})
    return result


def chunk_text(text, article_number=None, article_title=None):
    chunks, start, idx = [], 0, 0
    while start < len(text):
        chunk = text[start:start + CHUNK_SIZE]
        if chunk.strip():
            chunks.append({"article_number": article_number, "article_title": article_title, "content": chunk.strip(), "chunk_index": idx})
            idx += 1
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def get_embedding(text):
    return openai_client.embeddings.create(input=text[:8000], model="text-embedding-3-small", dimensions=1536).data[0].embedding


def index_law(law):
    fp = LAWS_DIR / law["filename"]
    if not fp.exists():
        print(f"  BRAK: {fp}  (pobierz z isap.sejm.gov.pl)")
        return 0
    text = fp.read_text(encoding="utf-8", errors="ignore")
    chunks = extract_articles(text)
    print(f"  {len(chunks)} chunków...")
    records = []
    for i, chunk in enumerate(chunks):
        print(f"  Embedding {i+1}/{len(chunks)}", end="\r")
        try:
            emb = get_embedding(chunk["content"])
            time.sleep(0.05)
        except Exception as e:
            print(f"\n  BLAD: {e}")
            continue
        records.append({**law, **chunk, "embedding": emb})
        del records[-1]["filename"]
        if len(records) >= BATCH_SIZE:
            supabase.table("law_documents").insert(records).execute()
            records = []
    if records:
        supabase.table("law_documents").insert(records).execute()
    print(f"\n  OK: {len(chunks)} chunków")
    return len(chunks)


def main():
    print("MOPS — Indeksowanie ustaw")
    if not LAWS_DIR.exists():
        LAWS_DIR.mkdir()
        print(f"Utworzono {LAWS_DIR}. Umieść tutaj pliki .txt ustaw.")
        return
    total = sum(index_law(l) for l in LAWS_CONFIG)
    print(f"\nGotowe! Zaindeksowano {total} fragmentów.")


if __name__ == "__main__":
    main()
