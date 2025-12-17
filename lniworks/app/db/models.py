from sqlalchemy import Column, Integer, String, Float, Text, Date, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()


class BoatType(str, enum.Enum):
    GOMMONE = "Gommone"
    OPTIMIST = "Optimist"
    FLY = "Fly"
    EQUIPE = "Equipe"
    CARAVELLE = "Caravella"
    TRIDENT = "Trident"
    CANOE = "Canoe"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"


class WorkCategory(str, enum.Enum):
    CAMPO = "Campo"
    OFFICINA = "Officina"
    SERVIZI = "Servizi"
    GOMMONI = "Gommoni"
    BARCHE = "Barche"
    VELE = "Vele"
    ALTRO = "Altro"


class ProblemStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    orders = relationship("Order", back_populates="user")
    works = relationship("Work", back_populates="user")
    problems = relationship("BoatProblem", back_populates="reported_by_user")


class Season(Base):
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True)
    year = Column(Integer, nullable=False)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    shifts = relationship("Shift", back_populates="season")


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    shift_number = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    season = relationship("Season", back_populates="shifts")
    orders = relationship("Order", back_populates="shift")
    works = relationship("Work", back_populates="shift")
    problems = relationship("BoatProblem", back_populates="shift")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)
    amount = Column(Float, nullable=False)
    category = Column(String(100), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    order_date = Column(Date, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="orders")
    shift = relationship("Shift", back_populates="orders")


class Work(Base):
    __tablename__ = "works"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(WorkCategory), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    work_date = Column(Date, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="works")
    shift = relationship("Shift", back_populates="works")


class Boat(Base):
    __tablename__ = "boats"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    type = Column(Enum(BoatType), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    problems = relationship("BoatProblem", back_populates="boat")


class BoatPart(Base):
    __tablename__ = "boat_parts"

    id = Column(Integer, primary_key=True)
    boat_type = Column(Enum(BoatType), nullable=False)
    part_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class BoatProblem(Base):
    __tablename__ = "boat_problems"

    id = Column(Integer, primary_key=True)
    boat_id = Column(Integer, ForeignKey("boats.id"), nullable=False)
    description = Column(Text, nullable=False)
    part_affected = Column(String(100), nullable=True)
    status = Column(Enum(ProblemStatus), default=ProblemStatus.OPEN)
    reported_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reported_date = Column(Date, nullable=False)
    resolved_date = Column(Date, nullable=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    boat = relationship("Boat", back_populates="problems")
    reported_by_user = relationship("User", back_populates="problems")
    shift = relationship("Shift", back_populates="problems")
    
    @property
    def boat_name(self):
        return self.boat.name if self.boat else None
    
    @property
    def boat_type(self):
        return self.boat.type if self.boat else None