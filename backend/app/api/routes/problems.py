from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import BoatProblem, Boat, Shift, ProblemStatus
from app.schemas.problem import ProblemCreate, ProblemUpdate, ProblemResponse
from app.api.dependencies import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/problems", tags=["problems"])


@router.post("/", response_model=ProblemResponse, status_code=status.HTTP_201_CREATED)
def create_problem(problem: ProblemCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    boat = db.query(Boat).filter(Boat.id == problem.boat_id).first()
    if not boat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Boat not found")

    shift = db.query(Shift).filter(Shift.id == problem.shift_id).first()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

    db_problem = BoatProblem(**problem.dict(), reported_by=current_user.id)
    db.add(db_problem)
    db.commit()
    db.refresh(db_problem)
    return db_problem

@router.get("/{problem_id}", response_model=ProblemResponse)
def get_problem(problem_id: int, db: Session = Depends(get_db)):
    problem = db.query(BoatProblem).join(Boat).filter(BoatProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    return problem

@router.get("/", response_model=list[ProblemResponse])
def list_problems(boat_id: int | None = None, status_filter: ProblemStatus | None = None, shift_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(BoatProblem).join(Boat)
    
    if boat_id:
        query = query.filter(BoatProblem.boat_id == boat_id)
    if status_filter:
        query = query.filter(BoatProblem.status == status_filter)
    if shift_id:
        query = query.filter(BoatProblem.shift_id == shift_id)
    
    problems = query.all()
    
    # Aggiungi boat_name e boat_type a ogni problema
    result = []
    for problem in problems:
        problem_dict = {
            "id": problem.id,
            "boat_id": problem.boat_id,
            "description": problem.description,
            "part_affected": problem.part_affected,
            "reported_date": problem.reported_date,
            "shift_id": problem.shift_id,
            "status": problem.status,
            "reported_by": problem.reported_by,
            "created_at": problem.created_at,
            "updated_at": problem.updated_at,
            "resolved_date": problem.resolved_date,
            "boat_name": problem.boat.name if problem.boat else None,
            "boat_type": problem.boat.type.value if problem.boat else None,
        }
        result.append(problem_dict)
    
    return result

@router.put("/{problem_id}", response_model=ProblemResponse)
def update_problem(problem_id: int, problem_update: ProblemUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    problem = db.query(BoatProblem).filter(BoatProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    
    update_data = problem_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(problem, field, value)
    
    db.commit()
    db.refresh(problem)
    return problem

@router.delete("/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_problem(problem_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    problem = db.query(BoatProblem).filter(BoatProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    
    db.delete(problem)
    db.commit()

@router.patch("/{problem_id}/toggle-status")
def toggle_problem_status(problem_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    problem = db.query(BoatProblem).filter(BoatProblem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    
    # Toggle status
    if problem.status == ProblemStatus.OPEN:
        problem.status = ProblemStatus.CLOSED
        problem.resolved_date = datetime.now().date()
    else:
        problem.status = ProblemStatus.OPEN
        problem.resolved_date = None
    
    db.commit()
    db.refresh(problem)
    return {"status": problem.status.value, "resolved_date": problem.resolved_date}