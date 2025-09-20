from sqlalchemy import Column, String, Text, Time, DateTime, Integer, ForeignKey, Enum, Boolean, Date, SmallInteger, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base

class UserRole(str, enum.Enum):
    PATIENT = "patient"
    CAREGIVER = "caregiver"
    CLINICIAN = "clinician"

class DoseStatus(str, enum.Enum):
    PENDING = "pending"
    TAKEN = "taken"
    SKIPPED = "skipped"
    SNOOZED = "snoozed"

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    auth0_sub = Column(Text, unique=True, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    name = Column(Text, nullable=False)
    phone_enc = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CaregiverLink(Base):
    __tablename__ = "caregiver_links"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    caregiver_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    patient = relationship("User", foreign_keys=[patient_id])
    caregiver = relationship("User", foreign_keys=[caregiver_id])

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
    status = Column(Enum(DoseStatus), nullable=False, default=DoseStatus.PENDING)
    taken_at = Column(DateTime(timezone=True))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")
    medication = relationship("Medication")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    dose_id = Column(UUID(as_uuid=True), ForeignKey("doses.id", ondelete="CASCADE"), nullable=False)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    ack_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    ack_at = Column(DateTime(timezone=True))
    meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    
    dose = relationship("Dose")
    ack_by_user = relationship("User")

class EscalationRule(Base):
    __tablename__ = "escalation_rules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    grace_minutes = Column(Integer, nullable=False, default=10)
    escalate_sms = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")

class IntakeEvent(Base):
    __tablename__ = "intake_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    raw_input_type = Column(Text, nullable=False)
    raw_input_ref = Column(Text)
    gemini_model = Column(Text, nullable=False)
    gemini_output = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")

class RiskDaily(Base):
    __tablename__ = "risk_daily"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    for_date = Column(Date, nullable=False)
    score = Column(SmallInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_log"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    action = Column(Text, nullable=False)
    entity_type = Column(Text, nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", foreign_keys=[user_id])
    actor = relationship("User", foreign_keys=[actor_id])
