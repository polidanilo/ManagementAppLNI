from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional


class ShiftBase(BaseModel):
    season_id: int
    shift_number: int
    start_date: date
    end_date: date


class ShiftCreate(ShiftBase):
    pass


class ShiftResponse(ShiftBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True