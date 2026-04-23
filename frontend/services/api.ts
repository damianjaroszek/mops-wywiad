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
      ? raw.map((e: any) => e.msg || JSON.stringify(e)).join("; ")
      : raw;
    return Promise.reject(new Error(detail || error.message || "Błąd połączenia z serwerem"));
  }
);

export interface Interview {
  id: string; created_at: string; updated_at: string;
  status: "draft" | "completed" | "exported";
  worker_name: string; form_data: any;
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

  // gender: "kobieta"/"mężczyzna" → "K"/"M"
  if (d.personal?.gender) {
    const g = d.personal.gender.toLowerCase();
    d.personal = { ...d.personal,
      gender: g === "k" || g === "kobieta" ? "K" : g === "m" || g.startsWith("m\u0119") ? "M" : d.personal.gender,
    };
  }

  return d;
}

export const healthCheck = async () => { try { await api.get("/health"); return true; } catch { return false; } };
export const createInterview = async (workerName: string, formData: any): Promise<Interview> => {
  const { financial, employment, ...rest } = formData;
  const merged = sanitizeFormData({ ...rest, employment: { ...employment, ...financial } });
  const safeWorkerName = (workerName || "").trim().length >= 2 ? workerName.trim() : "Pracownik socjalny";
  return (await api.post("/interviews", { worker_name: safeWorkerName, form_data: merged })).data;
};
export const listInterviews = async (page = 1, perPage = 20) => (await api.get("/interviews", { params: { page, per_page: perPage } })).data;
export const getInterview = async (id: string): Promise<Interview> => (await api.get(`/interviews/${id}`)).data;
export const deleteInterview = async (id: string) => api.delete(`/interviews/${id}`);
export const generateDocument = async (interviewId: string): Promise<GenerateResult> => (await api.post(`/interviews/${interviewId}/generate`, {})).data;
export const saveDraft = async (formData: any, interviewId?: string | null): Promise<Interview> => {
  if (interviewId) {
    return (await api.patch(`/interviews/${interviewId}`, { form_data: formData })).data;
  }
  return (await api.post("/interviews", { worker_name: "Pracownik socjalny", form_data: formData })).data;
};
