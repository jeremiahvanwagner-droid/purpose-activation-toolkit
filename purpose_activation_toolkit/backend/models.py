"""SQLAlchemy models for the Purpose Activation Toolkit backend."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class UserJourney(Base):
    __tablename__ = "user_journeys"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String(100), nullable=False)
    intention_statement = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    milestones = relationship("JourneyMilestone", back_populates="journey", cascade="all, delete-orphan")
    alignment_scores = relationship("DivineAlignmentScore", back_populates="journey", cascade="all, delete-orphan")


class JourneyMilestone(Base):
    __tablename__ = "journey_milestones"

    id = Column(Integer, primary_key=True, index=True)
    journey_id = Column(Integer, ForeignKey("user_journeys.id"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    achieved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    journey = relationship("UserJourney", back_populates="milestones")


class DivineAlignmentScore(Base):
    __tablename__ = "divine_alignment_scores"

    id = Column(Integer, primary_key=True, index=True)
    journey_id = Column(Integer, ForeignKey("user_journeys.id"), nullable=False, index=True)
    score = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    journey = relationship("UserJourney", back_populates="alignment_scores")
