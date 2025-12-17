from pydantic import BaseModel
from datetime import datetime


class OrderSummary(BaseModel):
    total_amount: float
    total_count: int
    pending_count: int
    completed_count: int


class WorkSummary(BaseModel):
    total_count: int
    pending_count: int
    completed_count: int
    by_category: dict[str, int]


class ProblemSummary(BaseModel):
    total_count: int
    open_count: int
    closed_count: int


class SeasonReport(BaseModel):
    season_name: str
    season_year: int
    total_orders_amount: float
    total_orders_count: int
    total_works_count: int
    total_problems_count: int
    shifts_data: list[dict]
    orders_summary: OrderSummary
    works_summary: WorkSummary
    problems_summary: ProblemSummary
    orders_by_category: dict[str, float]
    orders_by_month: dict[str, float]
    works_by_month: dict[str, int]