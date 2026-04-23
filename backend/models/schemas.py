"""
Pydantic v2 schematy — walidacja i serializacja danych
"""
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID
import re


# ─── Sekcje formularza ────────────────────────────────────────────────────────

class PersonalData(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    pesel: Optional[str] = Field(None, pattern=r"^\d{11}$")
    birth_date: Optional[str] = None
    gender: Optional[str] = Field(None, pattern=r"^(M|K)$")
    citizenship: str = "polskie"
    marital_status: Optional[str] = None
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_postal_code: Optional[str] = Field(None, pattern=r"^\d{2}-\d{3}$")
    phone: Optional[str] = None
    help_reasons: List[str] = Field(default_factory=list)

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v


class HousingData(BaseModel):
    apartment_type: Optional[str] = None
    rooms_count: Optional[int] = Field(None, ge=0, le=20)
    floor: Optional[int] = Field(None, ge=-2, le=50)
    has_elevator: Optional[bool] = None
    has_cold_water: Optional[bool] = None
    has_hot_water: Optional[bool] = None
    has_bathroom: Optional[bool] = None
    has_wc: Optional[bool] = None
    heating_type: Optional[str] = None
    has_gas: Optional[bool] = None
    apartment_condition: Optional[str] = None
    sleeping_places: Optional[int] = Field(None, ge=0, le=30)


class FamilyMember(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    birth_year: Optional[int] = Field(None, ge=1900, le=2030)
    relation: Optional[str] = None
    education: Optional[str] = None
    work_place: Optional[str] = None
    income_source: Optional[str] = None
    income_amount: Optional[float] = Field(None, ge=0)


class FamilyData(BaseModel):
    members: List[FamilyMember] = Field(default_factory=list)
    has_conflicts: Optional[bool] = None
    conflict_description: Optional[str] = Field(None, max_length=2000)
    has_domestic_violence: Optional[bool] = None
    violence_description: Optional[str] = Field(None, max_length=2000)
    has_childcare_issues: Optional[bool] = None
    childcare_description: Optional[str] = Field(None, max_length=2000)


class EmploymentData(BaseModel):
    employment_status: Optional[str] = None
    is_registered_unemployed: Optional[bool] = None
    has_unemployment_benefit: Optional[bool] = None
    unemployment_benefit_amount: Optional[float] = Field(None, ge=0)
    qualifications: Optional[str] = Field(None, max_length=1000)
    last_employment: Optional[str] = Field(None, max_length=500)
    # Finansowe razem z pracą
    total_family_income: Optional[float] = Field(None, ge=0)
    income_per_person: Optional[float] = Field(None, ge=0)
    monthly_expenses_total: Optional[float] = Field(None, ge=0)
    rent: Optional[float] = Field(None, ge=0)
    electricity: Optional[float] = Field(None, ge=0)
    gas_cost: Optional[float] = Field(None, ge=0)
    medications: Optional[float] = Field(None, ge=0)
    other_expenses: Optional[float] = Field(None, ge=0)
    needs_and_expectations: Optional[str] = Field(None, max_length=3000)


class HealthData(BaseModel):
    chronically_ill_persons: Optional[str] = Field(None, max_length=1000)
    illness_types: Optional[str] = Field(None, max_length=1000)
    has_health_insurance: Optional[bool] = None
    has_disability_certificate: Optional[bool] = None
    disability_degree: Optional[str] = None
    has_addiction: Optional[bool] = None
    addiction_type: Optional[str] = None
    additional_health_info: Optional[str] = Field(None, max_length=2000)


class FormData(BaseModel):
    """Główny model danych formularza — przechowywany jako JSONB"""
    personal: PersonalData
    housing: Optional[HousingData] = None
    family: Optional[FamilyData] = None
    employment: Optional[EmploymentData] = None
    health: Optional[HealthData] = None


# ─── Żądania / odpowiedzi API ────────────────────────────────────────────────

class CreateInterviewRequest(BaseModel):
    worker_name: str = Field(..., min_length=2, max_length=200)
    form_data: FormData

    @field_validator("worker_name", mode="before")
    @classmethod
    def strip_worker_name(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v


class UpdateInterviewRequest(BaseModel):
    worker_name: Optional[str] = Field(None, min_length=2, max_length=200)
    form_data: Optional[dict] = None
    status: Optional[str] = Field(None, pattern=r"^(draft|completed|exported)$")


class GenerateRequest(BaseModel):
    """Opcjonalne nadpisanie danych przy generowaniu"""
    worker_name: Optional[str] = Field(None, min_length=2, max_length=200)


class InterviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime
    status: str
    worker_name: str
    form_data: dict
    generated_document: Optional[str] = None
    used_law_references: Optional[List[str]] = None


class GenerateResponse(BaseModel):
    interview_id: UUID
    document: str
    law_references: List[str]
    processing_time_seconds: float


class ReviseRequest(BaseModel):
    instruction: str = Field(..., min_length=5, max_length=2000)
    current_document: str = Field(..., min_length=50)


class ReviseResponse(BaseModel):
    document: str
    processing_time_seconds: float


class PaginatedInterviews(BaseModel):
    items: List[InterviewResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool
