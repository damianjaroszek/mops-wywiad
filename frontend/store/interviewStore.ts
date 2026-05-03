/**
 * Zustand store — stan formularza wywiadu środowiskowego
 * Persystencja przez AsyncStorage
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface FamilyMember {
  id: string;
  name: string;
  birth_year?: number;
  gender?: string;
  marital_status?: string;
  relation?: string;
  // Wykształcenie i zatrudnienie
  education?: string;
  employment_status?: string;
  is_registered_unemployed?: boolean | null;
  has_unemployment_benefit?: boolean | null;
  unemployment_benefit_amount?: string;
  qualifications?: string;
  last_employment?: string;
  work_place?: string;
  // Dochody
  income_source?: string;
  income_amount?: number;
  // Zdrowie
  has_health_insurance?: boolean | null;
  illness_types?: string;
  has_disability_certificate?: boolean | null;
  disability_degree?: string;
  has_incapacity_certificate?: boolean | null;
  has_addiction?: boolean | null;
  addiction_types?: string[];
  additional_health_info?: string;
}

export interface FormData {
  personal: {
    first_name: string; last_name: string; pesel: string; birth_date: string;
    gender: string; citizenship: string; marital_status: string;
    address_street: string; address_city: string; address_postal_code: string;
    phone: string; income_amount: string; help_reasons: string[];
  };
  housing: {
    apartment_type: string; rooms_count: string; floor: string;
    has_cold_water: boolean; has_hot_water: boolean; has_bathroom: boolean;
    has_wc: boolean; heating_type: string; has_gas: boolean;
    apartment_condition: string; sleeping_places: string;
  };
  family: {
    members: FamilyMember[];
    has_conflicts: boolean | null; conflict_description: string;
    has_domestic_violence: boolean | null; violence_description: string;
    has_childcare_issues: boolean | null; childcare_description: string;
  };
  employment: {
    employment_status: string; is_registered_unemployed: boolean | null;
    has_unemployment_benefit: boolean | null; unemployment_benefit_amount: string;
    qualifications: string; last_employment: string;
  };
  health: {
    chronically_ill_count: string; illness_types: string;
    has_health_insurance: boolean | null; has_disability_certificate: boolean | null;
    disability_degree: string; has_incapacity_certificate: boolean | null; has_addiction: boolean | null;
    addiction_types: string[]; additional_health_info: string;
  };
  financial: {
    total_family_income: string; income_per_person: string;
    monthly_expenses_total: string;
    needs_and_expectations: string; selected_help_forms: string[];
  };
}

interface InterviewState {
  formData: FormData;
  currentStep: number;
  interviewId: string | null;
  generatedDocument: string | null;
  lawReferences: string[];
  isGenerating: boolean;
  updatePersonal: (data: Partial<FormData["personal"]>) => void;
  updateHousing: (data: Partial<FormData["housing"]>) => void;
  updateFamily: (data: Partial<FormData["family"]>) => void;
  addFamilyMember: (member: FamilyMember) => void;
  removeFamilyMember: (id: string) => void;
  updateFamilyMember: (id: string, data: Partial<FamilyMember>) => void;
  updateEmployment: (data: Partial<FormData["employment"]>) => void;
  updateHealth: (data: Partial<FormData["health"]>) => void;
  updateFinancial: (data: Partial<FormData["financial"]>) => void;
  setCurrentStep: (step: number) => void;
  setInterviewId: (id: string | null) => void;
  setGeneratedDocument: (doc: string, refs: string[]) => void;
  setIsGenerating: (val: boolean) => void;
  resetForm: () => void;
  loadInterviewData: (id: string, data: Partial<FormData>) => void;
}

const INIT: FormData = {
  personal: { first_name: "", last_name: "", pesel: "", birth_date: "", gender: "", citizenship: "polskie", marital_status: "", address_street: "", address_city: "", address_postal_code: "", phone: "", income_amount: "", help_reasons: [] },
  housing: { apartment_type: "", rooms_count: "", floor: "", has_cold_water: true, has_hot_water: false, has_bathroom: false, has_wc: false, heating_type: "", has_gas: false, apartment_condition: "", sleeping_places: "" },
  family: { members: [], has_conflicts: null, conflict_description: "", has_domestic_violence: null, violence_description: "", has_childcare_issues: null, childcare_description: "" },
  employment: { employment_status: "", is_registered_unemployed: null, has_unemployment_benefit: null, unemployment_benefit_amount: "", qualifications: "", last_employment: "" },
  health: { chronically_ill_count: "", illness_types: "", has_health_insurance: null, has_disability_certificate: null, disability_degree: "", has_incapacity_certificate: null, has_addiction: null, addiction_types: [], additional_health_info: "" },
  financial: { total_family_income: "", income_per_person: "", monthly_expenses_total: "", needs_and_expectations: "", selected_help_forms: [] },
};

export const useInterviewStore = create<InterviewState>()(
  persist(
    (set) => ({
      formData: INIT, currentStep: 1, interviewId: null,
      generatedDocument: null, lawReferences: [], isGenerating: false,
      updatePersonal: (d) => set((s) => ({ formData: { ...s.formData, personal: { ...s.formData.personal, ...d } } })),
      updateHousing: (d) => set((s) => ({ formData: { ...s.formData, housing: { ...s.formData.housing, ...d } } })),
      updateFamily: (d) => set((s) => ({ formData: { ...s.formData, family: { ...s.formData.family, ...d } } })),
      addFamilyMember: (m) => set((s) => ({ formData: { ...s.formData, family: { ...s.formData.family, members: [...s.formData.family.members, m] } } })),
      removeFamilyMember: (id) => set((s) => ({ formData: { ...s.formData, family: { ...s.formData.family, members: s.formData.family.members.filter((m) => m.id !== id) } } })),
      updateFamilyMember: (id, data) => set((s) => ({ formData: { ...s.formData, family: { ...s.formData.family, members: s.formData.family.members.map((m) => m.id === id ? { ...m, ...data } : m) } } })),
      updateEmployment: (d) => set((s) => ({ formData: { ...s.formData, employment: { ...s.formData.employment, ...d } } })),
      updateHealth: (d) => set((s) => ({ formData: { ...s.formData, health: { ...s.formData.health, ...d } } })),
      updateFinancial: (d) => set((s) => ({ formData: { ...s.formData, financial: { ...s.formData.financial, ...d } } })),
      setCurrentStep: (step) => set({ currentStep: step }),
      setInterviewId: (id) => set({ interviewId: id }),
      setGeneratedDocument: (doc, refs) => set({ generatedDocument: doc, lawReferences: refs }),
      setIsGenerating: (val) => set({ isGenerating: val }),
      resetForm: () => set({ formData: INIT, currentStep: 1, interviewId: null, generatedDocument: null, lawReferences: [], isGenerating: false }),
      loadInterviewData: (id, data) => set(() => ({ interviewId: id, formData: { ...INIT, ...data }, currentStep: 1, generatedDocument: null, lawReferences: [], isGenerating: false })),
    }),
    { name: "mops-interview-storage", storage: createJSONStorage(() => AsyncStorage) }
  )
);
