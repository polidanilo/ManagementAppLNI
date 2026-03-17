from pydantic import BaseModel
from datetime import datetime, date
from app.db.models import OrderStatus
from typing import List


class OrderBase(BaseModel):
    title: str | None = None
    description: str | None = None
    amount: float | None = None
    category: str | None = None
    order_date: date | None = None
    shift_id: int | None = None
    notes: str | None = None
    created_by: str | None = None


class OrderCreate(OrderBase):
    status: str | None = None


class OrderUpdate(OrderBase):
    title: str | None = None
    description: str | None = None
    amount: float | None = None
    category: str | None = None
    order_date: date | None = None
    shift_id: int | None = None
    notes: str | None = None
    created_by: str | None = None
    user_id: int | None = None
    status: str | None = None


class OrderResponse(OrderBase):
    id: int
    status: str | None = None
    user_id: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True