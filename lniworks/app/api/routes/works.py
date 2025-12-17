from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.db.session import get_db
from app.db.models import Work, Shift, OrderStatus, WorkCategory
from app.schemas.work import WorkCreate, WorkUpdate, WorkResponse
from app.api.dependencies import get_current_user
from fastapi.responses import StreamingResponse
from datetime import date
from io import BytesIO
import pandas as pd

router = APIRouter(prefix="/api/works", tags=["works"])


@router.post("/", response_model=WorkResponse, status_code=status.HTTP_201_CREATED)
def create_work(work: WorkCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    shift = db.query(Shift).filter(Shift.id == work.shift_id).first()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

    db_work = Work(**work.dict(), user_id=current_user.id)
    db.add(db_work)
    db.commit()
    db.refresh(db_work)
    return db_work

def apply_filters(query,
                  q: str | None,
                  date_from: date | None,
                  date_to: date | None,
                  category: WorkCategory | None,
                  status_filter: OrderStatus | None,
                  shift_id: int | None):
    if q:
        like = f"%{q}%"
        query = query.filter(or_(
            Work.title.ilike(like),
            Work.description.ilike(like),
        ))
    if date_from:
        query = query.filter(Work.work_date >= date_from)
    if date_to:
        query = query.filter(Work.work_date <= date_to)
    if category:
        query = query.filter(Work.category == category)
    if status_filter:
        query = query.filter(Work.status == status_filter)
    if shift_id:
        query = query.filter(Work.shift_id == shift_id)
    return query

def apply_sort(query, sort_by: str, order: str):
    mapping = {
        "work_date": Work.work_date,
        "created_at": Work.created_at,
        "updated_at": Work.updated_at,
        "title": Work.title,
        "status": Work.status,
        "category": Work.category,
    }
    col = mapping.get(sort_by, Work.work_date)
    return query.order_by(col.desc() if order.lower() == "desc" else col.asc())

@router.get("/", response_model=list[WorkResponse])
def list_works(
    q: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    category: WorkCategory | None = Query(None),
    status_filter: OrderStatus | None = Query(None),
    shift_id: int | None = Query(None),
    page: int = Query(0, ge=0),
    page_size: int = Query(0, ge=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1),
    sort_by: str = "work_date",
    order: str = "desc",
    db: Session = Depends(get_db)
):
    query = db.query(Work).options(joinedload(Work.user))
    query = apply_filters(query, q, date_from, date_to, category, status_filter, shift_id)
    query = apply_sort(query, sort_by, order)

    if page and page_size:
        offset = (page - 1) * page_size
        works = query.offset(offset).limit(page_size).all()
    else:
        works = query.offset(skip).limit(limit).all()

    # ← CONVERTI MANUALMENTE ogni work e popola created_by
    result = []
    for work in works:
        response_data = WorkResponse.model_validate(work)
        response_data.created_by = work.user.username if work.user else None
        result.append(response_data)

    return result

@router.get("/export")
def export_works(
    q: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    category: WorkCategory | None = Query(None),
    status_filter: OrderStatus | None = Query(None),
    shift_id: int | None = Query(None),
    sort_by: str = "work_date",
    order: str = "desc",
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Work).options(joinedload(Work.user))
    query = apply_filters(query, q, date_from, date_to, category, status_filter, shift_id)
    query = apply_sort(query, sort_by, order)
    rows = query.all()

    data = [
        {
            "ID": r.id,
            "Titolo": r.title,
            "Descrizione": r.description,
            "Categoria": r.category,
            "Stato": r.status,
            "Data lavoro": r.work_date,
            "Creato il": r.created_at,
            "Aggiornato il": r.updated_at,
            "Shift ID": r.shift_id,
            "User ID": r.user_id,
        }
        for r in rows
    ]
    df = pd.DataFrame(data)
    buf = BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Works")
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="works.xlsx"'},
    )

@router.get("/{work_id}", response_model=WorkResponse)
def get_work(work_id: int, db: Session = Depends(get_db)):
    work = db.query(Work).options(joinedload(Work.user)).filter(Work.id == work_id).first()
    if not work:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work not found")

    # ← CONVERTI MANUALMENTE a dict e popola created_by
    response_data = WorkResponse.model_validate(work)
    response_data.created_by = work.user.username if work.user else None

    return response_data

@router.put("/{work_id}", response_model=WorkResponse)
def update_work(work_id: int, work_update: WorkUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    work = db.query(Work).filter(Work.id == work_id).first()
    if not work:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work not found")

    update_data = work_update.dict(exclude_unset=True)

    for field, value in update_data.items():
        setattr(work, field, value)

    db.commit()

    # Ricarica con joinedload per avere user disponibile
    work = db.query(Work).options(joinedload(Work.user)).filter(Work.id == work_id).first()

    print(f"🔄 Work ricaricato - ID: {work.id}")
    print(f"🔄 work.user_id: {work.user_id}")
    print(f"🔄 work.user: {work.user}")
    if work.user:
        print(f"🔄 work.user.username: {work.user.username}")
        print(f"🔄 work.user.id: {work.user.id}")

    # ← CONVERTI MANUALMENTE a dict e popola created_by
    response_data = WorkResponse.model_validate(work)
    response_data.created_by = work.user.username if work.user else None

    print(f"🔄 Response data created_by: {response_data.created_by}")

    return response_data

@router.delete("/{work_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work(work_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    work = db.query(Work).filter(Work.id == work_id).first()
    if not work:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work not found")

    # ← Rimosso controllo autorizzazione - tutti gli utenti autenticati possono eliminare tutti i lavori

    db.delete(work)
    db.commit()