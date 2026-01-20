"""
FastAPI application for the Purpose Activation Toolkit.

This backend serves a minimal set of API endpoints to power interactive
features in the frontend such as submitting intention statements,
evaluating purpose audits and retrieving curated resources. It is
designed to be a foundation upon which more complex functionality
could be built, including database integration, authentication and
external integrations (e.g. email reminders, mentorship scheduling).
"""

from datetime import datetime
from typing import Generator, List, Optional

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .models import Base, DivineAlignmentScore, JourneyMilestone, UserJourney

DATABASE_URL = "sqlite:///./purpose_activation.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

app = FastAPI(title="Purpose Activation Toolkit API", version="0.1.0")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


class Intention(BaseModel):
    """Model for capturing intention submissions."""
    user_id: Optional[str] = Field(None, description="User identifier (optional)")
    statement: str = Field(..., description="User's intention or purpose statement")


class AuditResponse(BaseModel):
    """Response model for audit results."""
    score: int
    description: str
    mentorship_recommended: bool


class UserJourneyCreate(BaseModel):
    user_name: str = Field(..., description="Name of the user embarking on the journey.")
    intention_statement: str = Field(..., description="Primary intention or purpose statement.")


class UserJourneyResponse(BaseModel):
    id: int
    user_name: str
    intention_statement: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class JourneyMilestoneCreate(BaseModel):
    title: str = Field(..., description="Milestone title or focus area.")
    description: Optional[str] = Field(None, description="Details about the milestone.")
    achieved_at: Optional[datetime] = Field(None, description="Date the milestone was achieved.")


class JourneyMilestoneResponse(BaseModel):
    id: int
    journey_id: int
    title: str
    description: Optional[str]
    achieved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class DivineAlignmentScoreCreate(BaseModel):
    score: float = Field(..., description="Alignment score from a reflective practice.")
    notes: Optional[str] = Field(None, description="Optional notes about the score context.")
    recorded_at: datetime = Field(..., description="Timestamp for when the score was recorded.")


class DivineAlignmentScoreResponse(BaseModel):
    id: int
    journey_id: int
    score: float
    notes: Optional[str]
    recorded_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


@app.post("/api/intent")
async def submit_intention(intent: Intention):
    """Receive a user's intention statement.

    In a real implementation this would persist the intention to a
    database or trigger further processing (e.g. sending a gratitude
    confirmation email). Here we simply echo the intention back.
    """
    if not intent.statement.strip():
        raise HTTPException(status_code=400, detail="Intention statement cannot be empty.")
    # Placeholder: store intent in DB or send email
    return {"message": "Intention received", "statement": intent.statement}


@app.post("/api/audit")
async def evaluate_audit(responses: List[int]):
    """Evaluate purpose audit responses.

    The purpose audit consists of a series of questions scored 1–5.
    A higher total indicates stronger alignment with purpose. The
    simple logic below can be replaced with a more nuanced scoring
    algorithm or machine learning model in future iterations.
    """
    if not responses:
        raise HTTPException(status_code=400, detail="No responses provided.")
    if any(not isinstance(r, int) or r < 1 or r > 5 for r in responses):
        raise HTTPException(status_code=400, detail="All responses must be integers between 1 and 5.")
    total = sum(responses)
    # Determine description based on total score
    if total >= len(responses) * 4:
        description = "Excellent alignment with your purpose. Keep nurturing your intentions."
        mentorship = False
    elif total >= len(responses) * 3:
        description = "Moderate alignment. There is room to deepen your connection with your purpose."
        mentorship = False
    else:
        description = "Low alignment. Consider exploring mentorship opportunities to activate your purpose."
        mentorship = True
    return AuditResponse(score=total, description=description, mentorship_recommended=mentorship)


@app.get("/api/resources")
async def get_resources():
    """Return a curated list of recommended resources.

    In future versions this could query a database or external API to
    dynamically generate resource lists. For now we return a static
    selection from the toolkit's documentation.
    """
    resources = [
        {
            "title": "The Power of Intention",
            "type": "book",
            "author": "Dr. Wayne Dyer",
            "description": "A classic exploration of how intentions shape our reality."
        },
        {
            "title": "Becoming Supernatural",
            "type": "book",
            "author": "Dr. Joe Dispenza",
            "description": "Insights into the intersection of quantum science and human potential."
        },
        {
            "title": "Mindful Meditation for Beginners",
            "type": "video",
            "description": "A guided meditation to cultivate presence and awareness."
        },
        {
            "title": "Blue Quantum Podcast: Purpose & Vitality",
            "type": "podcast",
            "description": "A discussion on living purposefully with enhanced vitality."
        },
    ]
    return {"resources": resources}


@app.post("/api/journeys", response_model=UserJourneyResponse)
def create_journey(payload: UserJourneyCreate, db: Session = Depends(get_db)) -> UserJourney:
    journey = UserJourney(user_name=payload.user_name, intention_statement=payload.intention_statement)
    db.add(journey)
    db.commit()
    db.refresh(journey)
    return journey


@app.get("/api/journeys", response_model=List[UserJourneyResponse])
def list_journeys(db: Session = Depends(get_db)) -> List[UserJourney]:
    return db.query(UserJourney).order_by(UserJourney.created_at.desc()).all()


@app.get("/api/journeys/{journey_id}", response_model=UserJourneyResponse)
def get_journey(journey_id: int, db: Session = Depends(get_db)) -> UserJourney:
    journey = db.query(UserJourney).filter(UserJourney.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found.")
    return journey


@app.post("/api/journeys/{journey_id}/milestones", response_model=JourneyMilestoneResponse)
def create_milestone(
    journey_id: int, payload: JourneyMilestoneCreate, db: Session = Depends(get_db)
) -> JourneyMilestone:
    journey = db.query(UserJourney).filter(UserJourney.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found.")
    milestone = JourneyMilestone(
        journey_id=journey_id,
        title=payload.title,
        description=payload.description,
        achieved_at=payload.achieved_at,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


@app.get("/api/journeys/{journey_id}/milestones", response_model=List[JourneyMilestoneResponse])
def list_milestones(journey_id: int, db: Session = Depends(get_db)) -> List[JourneyMilestone]:
    journey = db.query(UserJourney).filter(UserJourney.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found.")
    return (
        db.query(JourneyMilestone)
        .filter(JourneyMilestone.journey_id == journey_id)
        .order_by(JourneyMilestone.created_at.desc())
        .all()
    )


@app.post("/api/journeys/{journey_id}/alignment-scores", response_model=DivineAlignmentScoreResponse)
def create_alignment_score(
    journey_id: int, payload: DivineAlignmentScoreCreate, db: Session = Depends(get_db)
) -> DivineAlignmentScore:
    journey = db.query(UserJourney).filter(UserJourney.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found.")
    alignment_score = DivineAlignmentScore(
        journey_id=journey_id,
        score=payload.score,
        notes=payload.notes,
        recorded_at=payload.recorded_at,
    )
    db.add(alignment_score)
    db.commit()
    db.refresh(alignment_score)
    return alignment_score


@app.get("/api/journeys/{journey_id}/alignment-scores", response_model=List[DivineAlignmentScoreResponse])
def list_alignment_scores(
    journey_id: int, db: Session = Depends(get_db)
) -> List[DivineAlignmentScore]:
    journey = db.query(UserJourney).filter(UserJourney.id == journey_id).first()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found.")
    return (
        db.query(DivineAlignmentScore)
        .filter(DivineAlignmentScore.journey_id == journey_id)
        .order_by(DivineAlignmentScore.recorded_at.desc())
        .all()
    )
