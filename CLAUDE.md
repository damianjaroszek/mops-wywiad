# CLAUDE.md — MOPS Wywiad Środowiskowy

> **Dla Claude Code:** Przeczytaj ten plik W CAŁOŚCI przed pisaniem kodu.
> Znajdziesz tu architekturę, konwencje, schemat bazy i kolejność implementacji.

---

## 📋 Co budujesz?

Aplikację mobilną (Android + iOS) dla pracowników socjalnych MOPS.

**Cel:** Pracownik wypełnia interaktywny formularz wywiadu środowiskowego →
AI generuje gotowe, formalne pismo urzędowe z powołaniem na konkretne przepisy prawa.

**Podstawa prawna formularza:** Rozporządzenie Ministra Rodziny, Pracy i Polityki Społecznej
z dnia 25 sierpnia 2016 r. w sprawie rodzinnego wywiadu środowiskowego (Dz.U. 2016 poz. 1406).

---

## 🏗️ Architektura

```
UŻYTKOWNIK (Android/iOS)
      │  Expo Go / .apk
      ▼
FRONTEND — React Native + Expo (TypeScript)
   expo-router • react-native-paper • zustand • react-hook-form
      │  HTTPS REST API
      ▼
BACKEND — FastAPI (Python 3.11)
   Supabase klient • Anthropic SDK • OpenAI SDK (tylko embeddingi)
      │
      ├──► Supabase PostgreSQL + pgvector
      │         interviews (JSONB)
      │         law_documents (vector embeddings)
      │
      └──► Anthropic Claude Haiku → generowanie pisma
           OpenAI text-embedding-3-small → RAG query
```

### Hosting (darmowy na start)
| Serwis | Co hostuje | Koszt |
|--------|-----------|-------|
| **Render.com** | Backend FastAPI | Free (usypia po 15 min) |
| **Supabase** | PostgreSQL + pgvector | Free (500 MB) |
| **Expo EAS** | Build .apk | Free (30 build/mies.) |

### Koszt API (szacunkowo)
- Embedding query: ~$0.0001 per wywiad
- Claude Haiku (generowanie ~1500 tokenów): ~$0.002 per wywiad
- **Łącznie: <$0.01 per wywiad** → 50 wywiadów/mies. ≈ $0.50

---

## 📁 Struktura projektu

```
mops-app/
├── CLAUDE.md                    ← ten plik
├── README.md
├── .gitignore
│
├── backend/                     ← FastAPI (Python)
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── render.yaml              ← konfiguracja Render.com
│   ├── .env.example
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── health.py
│   │   ├── interviews.py
│   │   └── generate.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ai_service.py
│   │   └── rag_service.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py
│   ├── db/
│   │   ├── __init__.py
│   │   └── supabase_client.py
│   └── scripts/
│       └── index_laws.py        ← uruchom raz po zebraniu ustaw
│
└── frontend/                    ← React Native + Expo
    ├── app.json
    ├── package.json
    ├── tsconfig.json
    ├── eas.json
    ├── .env.example
    ├── app/
    │   ├── _layout.tsx          ← root layout (Stack navigator)
    │   ├── index.tsx            ← ekran główny (lista wywiadów)
    │   └── interview/
    │       ├── _layout.tsx      ← layout z progress barem
    │       ├── step1.tsx        ← Dane osobowe
    │       ├── step2.tsx        ← Sytuacja mieszkaniowa
    │       ├── step3.tsx        ← Sytuacja rodzinna
    │       ├── step4.tsx        ← Sytuacja zawodowa i finansowa
    │       ├── step5.tsx        ← Sytuacja zdrowotna
    │       ├── summary.tsx      ← Podsumowanie przed generowaniem
    │       └── result.tsx       ← Wygenerowane pismo + eksport
    ├── components/
    │   ├── ui/
    │   │   ├── FormField.tsx
    │   │   ├── CheckboxGroup.tsx
    │   │   ├── RadioGroup.tsx
    │   │   ├── StepNavigation.tsx
    │   │   └── LoadingOverlay.tsx
    │   └── interview/
    │       ├── FakeDataGenerator.tsx
    │       └── DocumentViewer.tsx
    ├── store/
    │   └── interviewStore.ts    ← Zustand + AsyncStorage
    ├── services/
    │   └── api.ts               ← axios klient
    ├── constants/
    │   ├── formOptions.ts       ← wszystkie opcje list
    │   ├── fakeData.ts          ← fikcyjne dane testowe
    │   └── theme.ts             ← kolory, spacing
    └── hooks/
        └── useInterview.ts
```

---

## 🗄️ Schemat bazy danych Supabase

**WAŻNE:** Wklej poniższy SQL w Supabase → SQL Editor przed uruchomieniem aplikacji.

```sql
-- 1. Włącz rozszerzenia
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela wywiadów
CREATE TABLE interviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'draft'
        CHECK (status IN ('draft', 'completed', 'exported')),
    worker_name TEXT NOT NULL DEFAULT '',
    form_data JSONB NOT NULL DEFAULT '{}',
    generated_document TEXT,
    used_law_references TEXT[],
    CONSTRAINT worker_name_not_empty CHECK (length(trim(worker_name)) > 0)
);

-- 3. Indeks dla szybkiego sortowania
CREATE INDEX idx_interviews_created_at ON interviews(created_at DESC);
CREATE INDEX idx_interviews_status ON interviews(status);

-- 4. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_interviews_updated_at
    BEFORE UPDATE ON interviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Tabela dokumentów prawnych (RAG)
CREATE TABLE law_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    law_title TEXT NOT NULL,
    law_short_name TEXT NOT NULL,
    journal_reference TEXT NOT NULL,
    article_number TEXT,
    article_title TEXT,
    content TEXT NOT NULL,
    embedding vector(1536),
    chunk_index INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

-- 6. Indeks wektorowy HNSW (szybszy dla małych kolekcji)
CREATE INDEX idx_law_documents_embedding
    ON law_documents
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- 7. Funkcja wyszukiwania semantycznego
CREATE OR REPLACE FUNCTION match_law_documents(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.60,
    match_count INT DEFAULT 8
)
RETURNS TABLE (
    id UUID,
    law_title TEXT,
    law_short_name TEXT,
    journal_reference TEXT,
    article_number TEXT,
    article_title TEXT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE SQL STABLE AS $$
    SELECT
        id, law_title, law_short_name, journal_reference,
        article_number, article_title, content,
        1 - (embedding <=> query_embedding) AS similarity
    FROM law_documents
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
$$;

-- 8. Row Level Security (backend używa service_role → omija RLS)
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_interviews" ON interviews USING (false);
CREATE POLICY "service_role_only_law_documents" ON law_documents USING (false);
```

---

## 🔌 API Endpoints

```
GET  /api/v1/health                          → status serwera
GET  /api/v1/health/ping                     → keep-alive (200 OK)

POST /api/v1/interviews                      → utwórz wywiad
GET  /api/v1/interviews?page=1&per_page=20   → lista wywiadów
GET  /api/v1/interviews/{id}                 → pobierz wywiad
PATCH /api/v1/interviews/{id}                → aktualizuj
DELETE /api/v1/interviews/{id}               → usuń

POST /api/v1/interviews/{id}/generate        → generuj pismo AI
GET  /api/v1/interviews/{id}/document        → pobierz gotowe pismo
```

---

## 📱 Przepływ użytkownika (UX)

```
[Ekran główny]
  ↓ "Nowy wywiad"
[Step 1 — Dane osobowe]  ← przycisk "Losuj fikcyjne dane 🎲"
  ↓ "Dalej"
[Step 2 — Mieszkanie]
  ↓ "Dalej"
[Step 3 — Rodzina]
  ↓ "Dalej"
[Step 4 — Praca i finanse]
  ↓ "Dalej"
[Step 5 — Zdrowie]
  ↓ "Dalej"
[Podsumowanie]  ← podgląd wszystkich danych
  ↓ "Generuj wywiad" (15-30s, animacja ładowania)
[Wynik]  ← pełne pismo urzędowe
  ↓ "Eksportuj PDF" / "Udostępnij" / "Kopiuj"
```

---

## 🎨 Styl UI

### Paleta kolorów (używaj konsekwentnie)
```typescript
// constants/theme.ts
export const colors = {
  primary: '#1565C0',       // granat — przyciski, nagłówki
  primaryLight: '#E3F2FD',  // jasny niebieski — tła sekcji
  primaryDark: '#0D47A1',   // ciemny — active state
  secondary: '#455A64',     // szary — tekst pomocniczy
  success: '#2E7D32',       // zielony — OK, zatwierdź
  error: '#C62828',         // czerwony — błędy walidacji
  warning: '#E65100',       // pomarańczowy — ostrzeżenia
  background: '#F5F7FA',    // ekrany
  surface: '#FFFFFF',       // karty
  border: '#CFD8DC',        // obramowania
  text: {
    primary: '#1A237E',
    secondary: '#546E7A',
    disabled: '#90A4AE',
    inverse: '#FFFFFF',
  },
};
```

### Zasady UX (OBOWIĄZKOWE)
- Progress bar zawsze widoczny podczas formularza ("Krok 2 z 5")
- Pola wymagane oznaczane czerwoną gwiazdką `*`
- Walidacja PO kliknięciu "Dalej" — NIE inline podczas wpisywania
- Przyciski "Wstecz" / "Dalej" zawsze na dole ekranu (sticky footer)
- Minimum dotykowy obszar: **44×44 dp**
- Toast zamiast alert() dla błędów API
- Skeleton loading dla listy wywiadów
- Scrollable form — jeden ekran = jeden krok (ScrollView)

---

## 🔐 Bezpieczeństwo

### Zasady OBOWIĄZKOWE — nie kompromituj tych punktów:

1. **Klucze API wyłącznie w backendzie** — `EXPO_PUBLIC_*` to jedyna zmienna env frontendu
2. **Rate limiting** na `/generate`: max **5 req/min** per IP (slowapi)
3. **Walidacja Pydantic** na każdym POST/PATCH endpoint
4. **CORS** — tylko z dozwolonych originów (env var)
5. **Supabase service_role** tylko po stronie serwera — nigdy w kliencie
6. **Brak logów zawierających dane osobowe** — loguj UUID, nie treść formularza
7. **HTTPS** wszędzie — Render.com i Supabase dają SSL automatycznie
8. **Disclaimer w UI** — widoczna informacja: "Używaj wyłącznie fikcyjnych danych osobowych"

---

## 📜 Ustawy do zaindeksowania (RAG)

Pobierz teksty ze strony **https://isap.sejm.gov.pl** (zakładka "Poszukiwania"):

| Priorytet | Nazwa | Co szukać |
|-----------|-------|-----------|
| 🔴 KRYTYCZNY | Ustawa o pomocy społecznej | "pomoc społeczna" → tekst jednolity 2024 |
| 🔴 KRYTYCZNY | Rozp. MPRiPS 25.08.2016 (wywiad środowiskowy) | "wywiad środowiskowy 2016" |
| 🟡 WAŻNY | Ustawa o świadczeniach rodzinnych | "świadczenia rodzinne" → t.j. |
| 🟡 WAŻNY | Ustawa o pomocy w wychowaniu dzieci | "800+" / "wychowywanie" |
| 🟢 POMOCNY | Ustawa o wspieraniu rodziny | "wspieranie rodziny" |
| 🟢 POMOCNY | Ustawa o rehabilitacji zawodowej | "rehabilitacja zawodowa" |

Zapisz pliki jako `.txt` do `backend/scripts/laws/`, następnie uruchom:
```bash
cd backend && python scripts/index_laws.py
```

---

## ⚡ Render.com — ważna uwaga

Free tier "usypia" serwer po **15 minutach** braku ruchu.
Pierwsze żądanie po śnie trwa ~30 sekund.

**Rozwiązanie:** frontend pinguje `/api/v1/health/ping` co **10 minut** w tle.
Implementacja w `app/_layout.tsx` (useEffect z setInterval).

---

## 🚀 Kolejność implementacji

```
FAZA 1 — Backend (zacznij tu)
□ 1.1  main.py — FastAPI app, CORS, rate limiter
□ 1.2  models/schemas.py — Pydantic modele
□ 1.3  db/supabase_client.py — singleton klient
□ 1.4  routers/health.py — /health i /health/ping
□ 1.5  routers/interviews.py — CRUD
□ 1.6  services/rag_service.py — embeddingi + pgvector
□ 1.7  services/ai_service.py — Claude prompt + generowanie
□ 1.8  routers/generate.py — endpoint generowania
□ 1.9  Przetestuj przez http://localhost:8000/docs

FAZA 2 — Indeksowanie ustaw
□ 2.1  scripts/index_laws.py
□ 2.2  Pobierz ustawy (isap.sejm.gov.pl) → backend/scripts/laws/
□ 2.3  Uruchom skrypt → sprawdź w Supabase czy są rekordy

FAZA 3 — Frontend fundament
□ 3.1  app.json, package.json, tsconfig.json
□ 3.2  constants/theme.ts, constants/formOptions.ts, constants/fakeData.ts
□ 3.3  store/interviewStore.ts (Zustand)
□ 3.4  services/api.ts (axios)
□ 3.5  Komponenty UI: FormField, CheckboxGroup, RadioGroup
□ 3.6  app/_layout.tsx (root layout + keep-alive ping)
□ 3.7  app/index.tsx (lista wywiadów)

FAZA 4 — Ekrany formularza
□ 4.1  app/interview/_layout.tsx (progress bar)
□ 4.2  app/interview/step1.tsx — dane osobowe + FakeDataGenerator
□ 4.3  app/interview/step2.tsx — mieszkanie
□ 4.4  app/interview/step3.tsx — rodzina
□ 4.5  app/interview/step4.tsx — praca + finanse
□ 4.6  app/interview/step5.tsx — zdrowie
□ 4.7  app/interview/summary.tsx — podsumowanie
□ 4.8  app/interview/result.tsx — wynik + eksport PDF

FAZA 5 — Deploy i testy
□ 5.1  Deploy backendu na Render.com
□ 5.2  Ustaw EXPO_PUBLIC_API_URL na adres Render
□ 5.3  npx expo start → test przez Expo Go na Android
□ 5.4  npx eas build --platform android --profile preview → .apk
□ 5.5  Testy end-to-end pełnego przepływu
```

---

## 💡 Kluczowe decyzje techniczne

| Decyzja | Wybór | Powód |
|---------|-------|-------|
| AI model | Claude Haiku | Najtańszy, wystarczający do formalnych pism |
| Embeddingi | OpenAI text-embedding-3-small | $0.02/1M tokenów, 1536 dim |
| State mgmt | Zustand + AsyncStorage | Prosty, persystentny (draft nie ginie) |
| Formularze | react-hook-form + zod | Walidacja typowana, wydajna |
| UI library | react-native-paper | Material Design 3, gotowe komponenty |
| Routing | expo-router | File-based, podobny do Next.js |
| PDF export | expo-print | Bez natywnych zależności |
| Format danych | JSONB w Supabase | Elastyczny schemat formularza |

---

## ⚠️ Pułapki — unikaj

1. **NIE używaj Supabase anon key na backendzie** — zawsze service_role
2. **NIE przechowuj kluczy API w kodzie frontendu** — tylko `EXPO_PUBLIC_API_URL`
3. **NIE rób walidacji inline** — tylko przy przejściu między krokami
4. **NIE zapomnij o keep-alive** dla Render.com free tier
5. **NIE loguj form_data** — może zawierać dane osobowe
6. **NIE używaj alert()** w React Native — używaj Snackbar z react-native-paper
7. **Pamiętaj o `--break-system-packages`** przy pip install w środowisku Windows WSL/venv
