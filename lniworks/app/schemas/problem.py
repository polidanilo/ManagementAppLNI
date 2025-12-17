from pydantic import BaseModel
from datetime import datetime, date
from app.db.models import ProblemStatus


class ProblemBase(BaseModel):
    boat_id: int
    description: str
    part_affected: str | None = None
    reported_date: date
    shift_id: int


class ProblemCreate(ProblemBase):
    status: ProblemStatus = ProblemStatus.OPEN


class ProblemUpdate(BaseModel):
    description: str | None = None
    part_affected: str | None = None
    status: ProblemStatus | None = None
    reported_date: date | None = None
    reported_by: int | None = None
    resolved_date: date | None = None


class ProblemResponse(ProblemBase):
    id: int
    status: ProblemStatus
    reported_by: int
    created_at: datetime
    updated_at: datetime
    resolved_date: date | None = None
    boat_name: str | None = None
    boat_type: str | None = None

    class Config:
        from_attributes = True