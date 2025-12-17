from pydantic import BaseModel
from datetime import datetime
from app.db.models import BoatType


class BoatBase(BaseModel):
    name: str
    type: BoatType


class BoatCreate(BoatBase):
    pass


class BoatResponse(BoatBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True