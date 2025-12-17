from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.base import Base

from app.api.routes import auth, orders, works, boats, problems, seasons, shifts, reports, dashboard, admin

app = FastAPI(title="LNI Works API", description="Gestione centro nautico", version="1.0.0")

@app.on_event("startup")
def startup_db_setup():
    from app.db.session import engine, SessionLocal
    from app.db.models import User
    from app.core.security import hash_password

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    test_user = db.query(User).filter(User.username == "test").first()
    if not test_user:
        hashed_pwd = hash_password("test123")
        new_user = User(username="test", password_hash=hashed_pwd)
        db.add(new_user)
        db.commit()
    db.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(works.router)
app.include_router(boats.router)
app.include_router(problems.router)
app.include_router(seasons.router)
app.include_router(shifts.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {"message": "LNI Works API v1.0.0"}
