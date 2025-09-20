from sqlalchemy import Column, String, Text, Time, DateTime, Integer, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base

class UserRole(str, enum.Enum):
    PATIENT = "patient"
    CAREGIVER = "caregiver"
    CLINICIAN = "clinician"

class DoseStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    TAKEN = "taken"
    SKIPPED = "skipped"
    SNOOZED = "snoozed"
    MISSED = "missed"

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    auth0_sub = Column(String, unique=True, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    phone_enc = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Medication(Base):
    __tablename__ = "medications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(Text, nullable=False)
    strength_text = Column(Text)
    dose_text = Column(Text)
    instructions = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")
    med_times = relationship("MedTime", back_populates="medication")

class MedTime(Base):
    __tablename__ = "med_times"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    medication_id = Column(UUID(as_uuid=True), ForeignKey("medications.id", ondelete="CASCADE"), nullable=False)
    time_of_day = Column(Time, nullable=False)
    
    medication = relationship("Medication", back_populates="med_times")

class Dose(Base):
    __tablename__ = "doses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    medication_id = Column(UUID(as_uuid=True), ForeignKey("medications.id", ondelete="CASCADE"), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(DoseStatus), nullable=False, default=DoseStatus.SCHEDULED)
    taken_at = Column(DateTime(timezone=True))
    notes = Column(Text)
    
    user = relationship("User")
    medication = relationship("Medication")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    dose_id = Column(UUID(as_uuid=True), ForeignKey("doses.id", ondelete="CASCADE"), nullable=False)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    ack_by = Column(Text)
    ack_at = Column(DateTime(timezone=True))
    
    dose = relationship("Dose")

class RiskDaily(Base):
    __tablename__ = "risk_daily"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    for_date = Column(DateTime(timezone=True), nullable=False)
    score = Column(Integer, nullable=False)
    
    user = relationship("User")
