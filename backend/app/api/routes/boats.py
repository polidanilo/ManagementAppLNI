from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Boat, BoatPart, BoatType
from app.schemas.boat import BoatCreate, BoatResponse
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/boats", tags=["boats"])


@router.post("/", response_model=BoatResponse, status_code=status.HTTP_201_CREATED)
def create_boat(boat: BoatCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    db_boat = Boat(**boat.dict())
    db.add(db_boat)
    db.commit()
    db.refresh(db_boat)
    return db_boat


@router.get("/{boat_id}", response_model=BoatResponse)
def get_boat(boat_id: int, db: Session = Depends(get_db)):
    boat = db.query(Boat).filter(Boat.id == boat_id).first()
    if not boat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Boat not found")
    return boat


@router.get("/", response_model=list[BoatResponse])
def list_boats(boat_type: BoatType | None = None, db: Session = Depends(get_db)):
    query = db.query(Boat)
    if boat_type:
        query = query.filter(Boat.type == boat_type)
    return query.all()


@router.get("/type/{boat_type}/parts", response_model=list[str])
def get_boat_parts(boat_type: BoatType, db: Session = Depends(get_db)):
    parts = db.query(BoatPart).filter(BoatPart.boat_type == boat_type).all()
    return [p.part_name for p in parts]


@router.put("/{boat_id}", response_model=BoatResponse)
def update_boat(boat_id: int, boat_update: BoatCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    boat = db.query(Boat).filter(Boat.id == boat_id).first()
    if not boat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Boat not found")

    for field, value in boat_update.dict().items():
        setattr(boat, field, value)

    db.commit()
    db.refresh(boat)
    return boat


@router.delete("/{boat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_boat(boat_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    boat = db.query(Boat).filter(Boat.id == boat_id).first()
    if not boat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Boat not found")

    db.delete(boat)
    db.commit()