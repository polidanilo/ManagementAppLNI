from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Order, Work, BoatProblem, ProblemStatus, OrderStatus
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/home")
def get_home_dashboard(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    completed_orders = db.query(Order).filter(Order.status == OrderStatus.COMPLETED).order_by(Order.updated_at.desc()).limit(5).all()
    completed_works = db.query(Work).filter(Work.status == OrderStatus.COMPLETED).order_by(Work.updated_at.desc()).limit(5).all()
    open_problems = db.query(BoatProblem).filter(BoatProblem.status == ProblemStatus.OPEN).order_by(BoatProblem.reported_date.desc()).limit(10).all()
    
    return {
        "recent_completed_orders": [
            {
                "id": o.id,
                "title": o.title,
                "amount": o.amount,
                "date": o.order_date.isoformat(),
                "category": o.category
            } for o in completed_orders
        ],
        "recent_completed_works": [
            {
                "id": w.id,
                "title": w.title,
                "category": w.category.value,
                "date": w.work_date.isoformat()
            } for w in completed_works
        ],
        "open_problems": [
            {
                "id": p.id,
                "boat_id": p.boat_id,
                "boat_name": p.boat.name,
                "description": p.description,
                "part_affected": p.part_affected,
                "reported_date": p.reported_date.isoformat()
            } for p in open_problems
        ],
        "summary": {
            "total_open_problems": db.query(BoatProblem).filter(BoatProblem.status == ProblemStatus.OPEN).count(),
            "total_pending_orders": db.query(Order).filter(Order.status == OrderStatus.PENDING).count(),
            "total_pending_works": db.query(Work).filter(Work.status == OrderStatus.PENDING).count()
        }
    }