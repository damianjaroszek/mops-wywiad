# MOPS Wywiad Środowiskowy — Instrukcja Setup (Windows 10)

## 🎯 Co dostaniesz po wykonaniu tych kroków?

Działające środowisko deweloperskie na Windows 10 gotowe do pracy z Claude Code
w Visual Studio Code. Backend na localhost, frontend w Expo Go na telefonie.

---

## 📋 Wymagania wstępne

Zainstaluj w tej kolejności:

### 1. Python 3.11+
- Pobierz: https://www.python.org/downloads/
- ✅ Podczas instalacji zaznacz **"Add Python to PATH"**
- Weryfikacja: `python --version`

### 2. Node.js 20 LTS
- Pobierz: https://nodejs.org/en/download
- Instalator automatycznie doda do PATH
- Weryfikacja: `node --version` i `npm --version`

### 3. Git
- Pobierz: https://git-scm.com/download/win
- Zostaw domyślne opcje
- Weryfikacja: `git --version`

### 4. Visual Studio Code
- Pobierz: https://code.visualstudio.com/
- Zainstaluj rozszerzenia:
  - **Python** (ms-python.python)
  - **Pylance** (ms-python.vscode-pylance)
  - **ESLint** (dbaeumer.vscode-eslint)
  - **Prettier** (esbenp.prettier-vscode)
  - **Claude Code** (przez VS Code marketplace lub instrukcję na docs.claude.ai)

### 5. Expo Go na telefonie
- Android: https://play.google.com/store/apps/details?id=host.exp.exponent

### 6. Konto Expo (darmowe)
- Rejestracja: https://expo.dev/signup
- `npm install -g eas-cli` i `eas login`

---

## 🔑 Konta i klucze API (wszystkie darmowe na start)

### Supabase (baza danych)
1. Zarejestruj się: https://supabase.com
2. Kliknij **"New project"** → podaj nazwę `mops-app` i hasło
3. Czekaj ~2 minuty na inicjalizację
4. Skopiuj: **Project Settings → API → Project URL** i **service_role key**

### Anthropic Claude (AI generowanie)
1. Zarejestruj się: https://console.anthropic.com
2. Settings → API Keys → **Create Key**
3. Doładuj konto (minimum $5) — wystarczy na setki wywiadów

### OpenAI (embeddingi do RAG)
1. Zarejestruj się: https://platform.openai.com
2. API Keys → **Create new secret key**
3. Doładuj konto (minimum $5) — wystarczy na tysiące zapytań

### Render.com (hosting backendu)
1. Zarejestruj się: https://render.com (użyj GitHub OAuth)
2. Na razie nic nie konfiguruj — wrócimy przy deploy

---

## 🚀 Pierwsze uruchomienie

### Krok 1 — Pobierz projekt

Otwórz PowerShell lub Windows Terminal jako zwykły użytkownik (NIE admin):

```powershell
# Przejdź do folderu gdzie chcesz mieć projekt
cd C:\Users\TwojeImie\Documents

# Skopiuj pliki projektu (albo przez Claude Code, albo git clone)
# Zakładamy że folder mops-app już istnieje
cd mops-app
code .
```

### Krok 2 — Uruchom backend

W terminalu VS Code (Ctrl+`):

```powershell
# Przejdź do folderu backend
cd backend

# Utwórz wirtualne środowisko
python -m venv venv

# Aktywuj środowisko wirtualne
.\venv\Scripts\Activate.ps1
# Jeśli błąd polityki: Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# Zainstaluj zależności
pip install -r requirements.txt

# Skopiuj i uzupełnij konfigurację
copy .env.example .env
# Otwórz .env i wpisz klucze API

# Uruchom serwer
uvicorn main:app --reload --port 8000
```

✅ Backend działa gdy widzisz: `Application startup complete.`
📖 Sprawdź dokumentację API: http://localhost:8000/docs

### Krok 3 — Skonfiguruj bazę danych

1. Otwórz https://supabase.com → Twój projekt
2. Przejdź do **SQL Editor**
3. Skopiuj SQL z `CLAUDE.md` (sekcja "Schemat bazy danych") i kliknij **Run**
4. Sprawdź zakładkę **Table Editor** — powinieneś widzieć: `interviews` i `law_documents`

### Krok 4 — Uruchom frontend

Otwórz **nowy terminal** w VS Code (kliknij "+" w terminalu):

```powershell
cd frontend

# Zainstaluj zależności
npm install

# Skopiuj konfigurację
copy .env.example .env.local
# W .env.local zmień API_URL na: http://TWOJE_IP:8000
# Znajdź swoje IP: ipconfig (szukaj "Adres IPv4" dla WiFi)

# Uruchom Expo
npx expo start
```

✅ Expo uruchomiony gdy widzisz QR kod
📱 Zeskanuj QR aparatem (Android z Expo Go) lub z aplikacji Expo Go

> **Ważne:** Telefon i komputer muszą być w tej samej sieci WiFi!

---

## 📦 Indeksowanie ustaw (RAG)

Pobierz teksty ustaw z https://isap.sejm.gov.pl → skopiuj do `backend/scripts/laws/` jako `.txt`.

Minimalnie potrzebujesz:
- `pomoc_spoleczna.txt` — Ustawa o pomocy społecznej (tekst jednolity)
- `wywiad_srodowiskowy.txt` — Rozporządzenie z 25.08.2016

```powershell
# W terminalu backend (z aktywnym venv)
python scripts/index_laws.py
```

Sprawdź w Supabase → Table Editor → `law_documents` — powinny być rekordy.

---

## 🏗️ Build APK do testów

```powershell
cd frontend

# Zaloguj się do EAS
eas login

# Zainicjuj projekt EAS (tylko raz)
eas build:configure

# Zbuduj preview APK (kilka minut, na serwerach Expo)
eas build --platform android --profile preview

# Po ukończeniu pobierz .apk z linku w terminalu
# lub: https://expo.dev → Projects → Twój projekt → Builds
```

---

## 🌐 Deploy na Render.com

1. Wypchnij kod na GitHub: `git push origin main`
2. Zaloguj się na https://render.com
3. **New → Web Service** → wybierz repo
4. Ustawienia:
   - Name: `mops-api`
   - Runtime: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Root Directory: `backend`
5. Dodaj zmienne środowiskowe (skopiuj z `.env`)
6. Kliknij **Deploy**
7. Skopiuj URL serwisu (np. `https://mops-api.onrender.com`)
8. Zaktualizuj `frontend/.env.local`: `EXPO_PUBLIC_API_URL=https://mops-api.onrender.com`

---

## 🐛 Rozwiązywanie problemów

### "Cannot activate venv" (PowerShell)
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### "Network request failed" (Expo nie łączy z backendem)
- Upewnij się że telefon i PC są w tej samej sieci WiFi
- Sprawdź adres IP: `ipconfig` → "Adres IPv4"
- W `.env.local` zmień URL na `http://192.168.X.X:8000` (Twój IP)
- Jeśli firewall blokuje: Windows Defender Firewall → dozwól Python

### "Expo Go crashes"
- Zaktualizuj Expo Go do najnowszej wersji
- Wyczyść cache: `npx expo start -c`

### Backend "cold start" na Render (wolny pierwszy request)
- To normalne — free tier usypia po 15 min
- Frontend wysyła ping co 10 min (zaimplementowane w `app/_layout.tsx`)
- Rozwiązanie docelowe: upgrade do Render Starter ($7/mies.)

---

## 💬 Praca z Claude Code

1. Otwórz VS Code w folderze `mops-app`
2. Uruchom Claude Code (Ctrl+Shift+P → "Claude: Open")
3. Claude automatycznie odczyta `CLAUDE.md` — znaj kontekst projektu
4. Zacznij od: **"Wdróż FAZĘ 1 z CLAUDE.md — zacznij od backend/routers/health.py"**

Sugerowane pierwsze polecenia do Claude Code:
```
"Zaimplementuj FAZĘ 1 z CLAUDE.md. Zacznij od health.py i interviews.py"
"Wygeneruj kompletny step1.tsx zgodnie z wymaganiami z CLAUDE.md"
"Dodaj walidację zod do store/interviewStore.ts"
```
