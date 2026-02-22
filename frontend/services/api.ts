import axios, { AxiosError } from "axios";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const detail = (error.response?.data as any)?.detail;
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

export const healthCheck = async () => { try { await api.get("/health"); return true; } catch { return false; } };
export const createInterview = async (workerName: string, formData: any): Promise<Interview> => {
  // Backend trzyma dane finansowe w sekcji employment — scalamy przed wysłaniem
  const { financial, employment, ...rest } = formData;
  const mergedFormData = { ...rest, employment: { ...employment, ...financial } };
  return (await api.post("/interviews", { worker_name: workerName, form_data: mergedFormData })).data;
};
export const listInterviews = async (page = 1, perPage = 20) => (await api.get("/interviews", { params: { page, per_page: perPage } })).data;
export const getInterview = async (id: string): Promise<Interview> => (await api.get(`/interviews/${id}`)).data;
export const deleteInterview = async (id: string) => api.delete(`/interviews/${id}`);
export const generateDocument = async (interviewId: string): Promise<GenerateResult> => (await api.post(`/interviews/${interviewId}/generate`, {})).data;
export const saveDraft = async (formData: any, interviewId?: string | null): Promise<Interview> => {
  if (interviewId) {
    return (await api.patch(`/interviews/${interviewId}`, { form_data: formData })).data;
  }
  return (await api.post("/interviews", { worker_name: "—", form_data: formData })).data;
};
