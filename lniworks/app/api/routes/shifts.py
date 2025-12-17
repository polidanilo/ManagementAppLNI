from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Shift, Season
from app.schemas.shift import ShiftCreate, ShiftResponse
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/shifts", tags=["shifts"])


@router.post("/", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
def create_shift(shift: ShiftCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    season = db.query(Season).filter(Season.id == shift.season_id).first()
    if not season:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")

    db_shift = Shift(**shift.dict())
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    return db_shift

@router.get("/{shift_id}", response_model=ShiftResponse)
def get_shift(shift_id: int, db: Session = Depends(get_db)):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
    return shift

@router.get("/season/{season_id}", response_model=list[ShiftResponse])
def list_shifts_by_season(season_id: int, db: Session = Depends(get_db)):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    
    return db.query(Shift).filter(Shift.season_id == season_id).all()