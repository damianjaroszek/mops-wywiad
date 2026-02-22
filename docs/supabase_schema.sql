-- ============================================================
-- MOPS Wywiad Środowiskowy — Schemat bazy danych Supabase
-- Uruchom w: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Włącz rozszerzenia
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela wywiadów
CREATE TABLE IF NOT EXISTS interviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'exported')),
    worker_name TEXT NOT NULL DEFAULT '',
    form_data JSONB NOT NULL DEFAULT '{}',
    generated_document TEXT,
    used_law_references TEXT[]
);

-- Automatyczne updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER interviews_updated_at
    BEFORE UPDATE ON interviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indeks na datę
CREATE INDEX IF NOT EXISTS idx_interviews_created_at ON interviews(created_at DESC);

-- 3. Tabela dokumentów prawnych (RAG)
CREATE TABLE IF NOT EXISTS law_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    law_title TEXT NOT NULL,
    law_short_name TEXT NOT NULL,
    journal_reference TEXT NOT NULL,
    article_number TEXT,
    article_title TEXT,
    content TEXT NOT NULL,
    embedding vector(1536),
    chunk_index INTEGER DEFAULT 0
);

-- Indeks wektorowy HNSW
CREATE INDEX IF NOT EXISTS idx_law_documents_embedding
    ON law_documents USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- 4. Funkcja wyszukiwania semantycznego
CREATE OR REPLACE FUNCTION match_law_documents(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.60,
    match_count INT DEFAULT 8
)
RETURNS TABLE (
    id UUID, law_title TEXT, law_short_name TEXT,
    journal_reference TEXT, article_number TEXT,
    article_title TEXT, content TEXT, similarity FLOAT
)
LANGUAGE SQL STABLE AS $$
    SELECT id, law_title, law_short_name, journal_reference,
           article_number, article_title, content,
           1 - (embedding <=> query_embedding) AS similarity
    FROM law_documents
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
$$;

-- 5. Row Level Security
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_documents ENABLE ROW LEVEL SECURITY;

-- Tylko service_role (backend) ma dostęp — anon key zablokowany
CREATE POLICY "service_role_only_interviews" ON interviews FOR ALL USING (false);
CREATE POLICY "service_role_only_law_docs" ON law_documents FOR ALL USING (false);

-- ============================================================
-- Gotowe! Teraz:
-- 1. Skopiuj service_role key z Project Settings → API
-- 2. Wstaw do backend/.env jako SUPABASE_SERVICE_KEY
-- 3. Uruchom backend: uvicorn main:app --reload
-- 4. Zaindeksuj ustawy: python scripts/index_laws.py
-- ============================================================
