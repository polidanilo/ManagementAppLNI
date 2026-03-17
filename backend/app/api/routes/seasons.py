from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Season
from app.schemas.season import SeasonCreate, SeasonResponse
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/api/seasons", tags=["seasons"])


@router.post("/", response_model=SeasonResponse, status_code=status.HTTP_201_CREATED)
def create_season(season: SeasonCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    existing_season = db.query(Season).filter(Season.year == season.year).first()
    if existing_season:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Season already exists")

    db_season = Season(**season.dict())
    db.add(db_season)
    db.commit()
    db.refresh(db_season)
    return db_season

@router.get("/{season_id}", response_model=SeasonResponse)
def get_season(season_id: int, db: Session = Depends(get_db)):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
    return season

@router.get("/", response_model=list[SeasonResponse])
def list_seasons(db: Session = Depends(get_db)):
    return db.query(Season).all()