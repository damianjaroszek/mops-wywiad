import axios, { AxiosError } from "axios";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 90000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const raw = (error.response?.data as any)?.detail;
    const detail = Array.isArray(raw)
      ? raw
          .map((e: any) => {
            // Include field path (loc) so user sees WHICH field fails, not just the error type
            const loc = Array.isArray(e.loc) ? e.loc.slice(2).join(" → ") : "";
            return loc ? `${loc}: ${e.msg}` : (e.msg || JSON.stringify(e));
          })
          .join("; ")
      : (typeof raw === "string" ? raw : null);
    return Promise.reject(new Error(detail || error.message || "Błąd połączenia z serwerem"));
  }
);

export interface Interview {
  id: string; created_at: string; updated_at: string;
  status: "draft" | "completed" | "exported";
  form_data: any;
  generated_document?: string; used_law_references?: string[];
}

export interface GenerateResult {
  interview_id: string; document: string;
  law_references: string[]; processing_time_seconds: number;
}

const toFloat = (v: any) => { const n = parseFloat(String(v ?? "")); return isNaN(n) ? null : n; };
const toInt   = (v: any) => { const n = parseInt(String(v ?? ""));   return isNaN(n) ? null : n; };

function sanitizeFormData(data: any): any {
  const d = { ...data };

  // Pola liczbowe — housing
  if (d.housing) d.housing = { ...d.housing,
    rooms_count:    toInt(d.housing.rooms_count),
    floor:          toInt(d.housing.floor),
    sleeping_places: toInt(d.housing.sleeping_places),
  };

  // Pola liczbowe — employment (po scaleniu z financial)
  if (d.employment) d.employment = { ...d.employment,
    unemployment_benefit_amount: toFloat(d.employment.unemployment_benefit_amount),
    total_family_income:         toFloat(d.employment.total_family_income),
    income_per_person:           toFloat(d.employment.income_per_person),
    monthly_expenses_total:      toFloat(d.employment.monthly_expenses_total),
    rent:                        toFloat(d.employment.rent),
    electricity:                 toFloat(d.employment.electricity),
    gas_cost:                    toFloat(d.employment.gas_cost),
    medications:                 toFloat(d.employment.medications),
    other_expenses:              toFloat(d.employment.other_expenses),
  };

  // personal: gender "kobieta"/"mezczyzna" -> "K"/"M", pusty string -> null dla pol z pattern-match
  if (d.personal) {
    let gender: string | null = d.personal.gender ?? "";
    if (gender) {
      const g = gender.toLowerCase();
      gender = g === "k" || g === "kobieta" ? "K"
             : g === "m" || g.startsWith("mę") ? "M"
             : gender;
    }
    d.personal = {
      ...d.personal,
      gender:               gender || null,
      pesel:                d.personal.pesel || null,
      address_postal_code:  d.personal.address_postal_code || null,
    };
  }

  // family members: konwertuj pola numeryczne
  if (d.family?.members) {
    d.family = {
      ...d.family,
      members: d.family.members.map((m: any) => ({
        ...m,
        birth_year:                  toInt(m.birth_year),
        income_amount:               toFloat(m.income_amount),
        unemployment_benefit_amount: toFloat(m.unemployment_benefit_amount),
      })),
    };
  }

  return d;
}

export const healthCheck = async () => { try { await api.get("/health"); return true; } catch { return false; } };
export const createInterview = async (formData: any): Promise<Interview> => {
  const { financial, employment, ...rest } = formData;
  const merged = sanitizeFormData({ ...rest, employment: { ...employment, ...financial } });
  return (await api.post("/interviews", { form_data: merged })).data;
};
export const listInterviews = async (page = 1, perPage = 20) => (await api.get("/interviews", { params: { page, per_page: perPage } })).data;
export const getInterview = async (id: string): Promise<Interview> => (await api.get(`/interviews/${id}`)).data;
export const deleteInterview = async (id: string) => api.delete(`/interviews/${id}`);
export const generateDocument = async (interviewId: string): Promise<GenerateResult> => (await api.post(`/interviews/${interviewId}/generate`, {})).data;
export const reviseDocument = async (
  interviewId: string,
  instruction: string,
  currentDocument: string,
  selectedFragment?: string,
): Promise<{ document: string; processing_time_seconds: number }> =>
  (await api.post(`/interviews/${interviewId}/revise`, {
    instruction,
    current_document: currentDocument,
    ...(selectedFragment ? { selected_fragment: selectedFragment } : {}),
  })).data;

export function normalizeFormDataForStore(raw: any): any {
  if (!raw) return {};
  const { employment: emp, financial: fin, family, health, ...rest } = raw;

  const empSrc = emp ?? {};
  const finSrc = fin ?? empSrc;

  const employment = {
    employment_status:            empSrc.employment_status            ?? "",
    is_registered_unemployed:     empSrc.is_registered_unemployed     ?? null,
    has_unemployment_benefit:     empSrc.has_unemployment_benefit     ?? null,
    unemployment_benefit_amount:  String(empSrc.unemployment_benefit_amount ?? ""),
    qualifications:               empSrc.qualifications               ?? "",
    last_employment:              empSrc.last_employment              ?? "",
  };

  const financial = {
    total_family_income:    String(finSrc.total_family_income    ?? ""),
    income_per_person:      String(finSrc.income_per_person      ?? ""),
    monthly_expenses_total: String(finSrc.monthly_expenses_total ?? ""),
    rent:                   String(finSrc.rent                   ?? ""),
    electricity:            String(finSrc.electricity            ?? ""),
    gas_cost:               String(finSrc.gas_cost               ?? ""),
    medications:            String(finSrc.medications            ?? ""),
    other_expenses:         String(finSrc.other_expenses         ?? ""),
    needs_and_expectations: finSrc.needs_and_expectations        ?? "",
  };

  const normalizedFamily = family ? {
    ...family,
    members: (family.members ?? []).map((m: any, i: number) => ({
      ...m,
      id: m.id ?? String(Date.now() + i),
    })),
  } : undefined;

  const normalizedHealth = health ? {
    ...health,
    chronically_ill_count: health.chronically_ill_count ?? health.chronically_ill_persons ?? "",
    addiction_types: health.addiction_types
      ?? (health.addiction_type ? [health.addiction_type] : []),
  } : undefined;

  return {
    ...rest,
    employment,
    financial,
    ...(normalizedFamily  ? { family: normalizedFamily }  : {}),
    ...(normalizedHealth  ? { health: normalizedHealth }  : {}),
  };
}

export const saveDraft = async (formData: any, interviewId?: string | null): Promise<Interview> => {
  if (interviewId) {
    return (await api.patch(`/interviews/${interviewId}`, { form_data: formData })).data;
  }
  // No interviewId = new record; reuse createInterview so sanitization runs
  return createInterview(formData);
};
