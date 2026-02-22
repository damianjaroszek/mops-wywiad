"""
Skrypt jednorazowego indeksowania ustaw w Supabase pgvector.

Użycie:
  1. Wrzuć dowolne pliki .pdf / .docx / .txt do folderu backend/laws_texts/
  2. Uruchom: python scripts/index_laws.py

Nazwy plików są dowolne. Skrypt automatycznie indeksuje wszystko co znajdzie.
Dla znanych ustaw (patrz KNOWN_LAWS niżej) przypisuje pełne metadane.

Koszt: ~$0.02 za całość (OpenAI text-embedding-3-small)
"""
import os, re, sys, time, unicodedata
from pathlib import Path
from dotenv import load_dotenv
import pdfplumber
import docx

sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv(Path(__file__).parent.parent / ".env")

from openai import OpenAI
from db.supabase_client import get_supabase

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase = get_supabase()

def normalize_stem(text: str) -> str:
    """Małe litery, usuń polskie znaki, spacje/myślniki → podkreślniki."""
    text = text.lower()
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    text = re.sub(r'[\s\-]+', '_', text)
    return text


# Metadane dla znanych ustaw.
# Klucz = krotka fragmentów — WSZYSTKIE muszą wystąpić w znormalizowanej nazwie pliku.
# Fragmenty są krótsze niż pełne słowo, żeby działały przy różnych odmianach (np. "wspier" → wspieranie/wspieraniu).
KNOWN_LAWS = {
    ("pomoc",   "spolecz"):         {"law_title": "Ustawa z dnia 12 marca 2004 r. o pomocy społecznej",                                          "law_short_name": "u.p.s.", "journal_reference": "Dz.U. 2023 poz. 901"},
    ("wywiad",):                    {"law_title": "Rozporządzenie MPRiPS z dnia 25 sierpnia 2016 r. w sprawie rodzinnego wywiadu środowiskowego", "law_short_name": "r.w.ś.", "journal_reference": "Dz.U. 2017 poz. 1788"},
    ("swiadczen", "rodzinn"):       {"law_title": "Ustawa z dnia 28 listopada 2003 r. o świadczeniach rodzinnych",                               "law_short_name": "u.ś.r.", "journal_reference": "Dz.U. 2024 poz. 323"},
    ("wspier",):                    {"law_title": "Ustawa z dnia 9 czerwca 2011 r. o wspieraniu rodziny",                                        "law_short_name": "u.w.r.", "journal_reference": "Dz.U. 2024 poz. 177"},
    ("rehabilitacj",):              {"law_title": "Ustawa z dnia 27 sierpnia 1997 r. o rehabilitacji zawodowej",                                 "law_short_name": "u.r.z.", "journal_reference": "Dz.U. 2024 poz. 44"},
}

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}
LAWS_DIR = Path(__file__).parent.parent / "laws_texts"
CHUNK_SIZE, CHUNK_OVERLAP, BATCH_SIZE = 800, 150, 50


def resolve_metadata(fp: Path) -> dict:
    stem = normalize_stem(fp.stem)
    for keywords, meta in KNOWN_LAWS.items():
        if all(kw in stem for kw in keywords):
            return meta
    # Nieznany plik — użyj nazwy jako tytułu
    return {"law_title": fp.stem.replace("_", " "), "law_short_name": fp.stem[:20], "journal_reference": ""}


def extract_text(fp: Path) -> str:
    ext = fp.suffix.lower()
    if ext == ".pdf":
        pages = []
        with pdfplumber.open(fp) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
        return "\n".join(pages)
    if ext == ".docx":
        document = docx.Document(fp)
        return "\n".join(p.text for p in document.paragraphs if p.text.strip())
    return fp.read_text(encoding="utf-8", errors="ignore")


def extract_articles(text):
    pattern = re.compile(r'(Art\.\s*\d+[a-z]?\..*?)(?=Art\.\s*\d+[a-z]?\.|\Z)', re.DOTALL | re.IGNORECASE)
    articles = pattern.findall(text)
    if not articles:
        return chunk_text(text)
    result = []
    for a in articles:
        a = a.strip()
        if len(a) < 50:
            continue
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


def index_file(fp: Path) -> int:
    meta = resolve_metadata(fp)
    print(f"\n[{fp.name}]  →  {meta['law_title'][:60]}...")
    text = extract_text(fp)
    if not text.strip():
        print("  PUSTY plik, pomijam.")
        return 0
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
        records.append({**meta, **chunk, "embedding": emb})
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
        print(f"Utworzono {LAWS_DIR}. Wrzuć tutaj pliki .pdf / .docx / .txt i uruchom ponownie.")
        return
    files = sorted(f for f in LAWS_DIR.iterdir() if f.suffix.lower() in SUPPORTED_EXTENSIONS)
    if not files:
        print(f"Brak plików w {LAWS_DIR}. Wrzuć .pdf / .docx / .txt i uruchom ponownie.")
        return
    print(f"Znaleziono {len(files)} plik(ów): {[f.name for f in files]}")
    total = sum(index_file(f) for f in files)
    print(f"\nGotowe! Zaindeksowano {total} fragmentów łącznie.")


if __name__ == "__main__":
    main()
