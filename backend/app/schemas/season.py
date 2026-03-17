from pydantic import BaseModel
from datetime import datetime


class SeasonBase(BaseModel):
    year: int
    name: str


class SeasonCreate(SeasonBase):
    pass


class SeasonResponse(SeasonBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True