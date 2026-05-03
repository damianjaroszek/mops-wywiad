"""
Router: CRUD wywiadów środowiskowych
"""
from fastapi import APIRouter, HTTPException, Request, Query
from slowapi import Limiter
from slowapi.util import get_remote_address
from uuid import UUID
from db.supabase_client import get_supabase
from models.schemas import (
    CreateInterviewRequest,
    UpdateInterviewRequest,
    InterviewResponse,
    PaginatedInterviews,
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/interviews", response_model=InterviewResponse, status_code=201)
@limiter.limit("30/minute")
async def create_interview(request: Request, body: CreateInterviewRequest):
    """Tworzy nowy wywiad (szkic)."""
    supabase = get_supabase()
    data = {
        "worker_name": "Pracownik socjalny",
        "form_data": body.form_data.model_dump(),
        "status": "draft",
    }
    result = supabase.table("interviews").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Nie udało się zapisać wywiadu.")
    return result.data[0]


@router.get("/interviews", response_model=PaginatedInterviews)
@limiter.limit("60/minute")
async def list_interviews(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """Zwraca paginowaną listę wywiadów (od najnowszego)."""
    supabase = get_supabase()
    offset = (page - 1) * per_page

    count_result = supabase.table("interviews").select("id", count="exact").execute()
    total = count_result.count or 0

    result = (
        supabase.table("interviews")
        .select("*")
        .order("created_at", desc=True)
        .range(offset, offset + per_page - 1)
        .execute()
    )
    return {
        "items": result.data or [],
        "total": total,
        "page": page,
        "per_page": per_page,
        "has_next": (offset + per_page) < total,
        "has_prev": page > 1,
    }


@router.get("/interviews/{interview_id}", response_model=InterviewResponse)
async def get_interview(interview_id: UUID):
    """Pobiera pojedynczy wywiad."""
    supabase = get_supabase()
    result = supabase.table("interviews").select("*").eq("id", str(interview_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Wywiad nie istnieje.")
    return result.data[0]


@router.patch("/interviews/{interview_id}", response_model=InterviewResponse)
async def update_interview(interview_id: UUID, body: UpdateInterviewRequest):
    """Aktualizuje wywiad."""
    supabase = get_supabase()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Brak danych do aktualizacji.")
    result = (
        supabase.table("interviews")
        .update(update_data)
        .eq("id", str(interview_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Wywiad nie istnieje.")
    return result.data[0]


@router.delete("/interviews/{interview_id}", status_code=204)
async def delete_interview(interview_id: UUID):
    """Usuwa wywiad."""
    supabase = get_supabase()
    supabase.table("interviews").delete().eq("id", str(interview_id)).execute()
