"""
FastAPI application for the Purpose Activation Toolkit.

This backend serves a minimal set of API endpoints to power interactive
features in the frontend such as submitting intention statements,
evaluating purpose audits and retrieving curated resources. It is
designed to be a foundation upon which more complex functionality
could be built, including database integration, authentication and
external integrations (e.g. email reminders, mentorship scheduling).
"""

from datetime import datetime, timedelta
import os
from typing import List, Literal, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from backend.worker import send_audit_follow_up, send_weekly_reminder

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_EXPIRE_MINUTES", "30"))
JWT_REFRESH_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_EXPIRE_DAYS", "7"))
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
API_USERNAME = os.getenv("API_USERNAME", "admin")
API_PASSWORD = os.getenv("API_PASSWORD", "purpose")

app = FastAPI(title="Purpose Activation Toolkit API", version="0.1.0")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")


class Intention(BaseModel):
    """Model for capturing intention submissions."""
    user_id: Optional[str] = Field(None, description="User identifier (optional)")
    statement: str = Field(..., description="User's intention or purpose statement")


class AuditResponse(BaseModel):
    """Response model for audit results."""
    score: int
    description: str
    mentorship_recommended: bool


class LoginCredentials(BaseModel):
    """Credentials used to obtain access tokens."""
    username: str = Field(..., description="Login username")
    password: str = Field(..., description="Login password")


class TokenResponse(BaseModel):
    """Token response containing access and refresh tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class ReminderRequest(BaseModel):
    """Payload describing which reminder to enqueue."""
    reminder_type: Literal["weekly_email", "audit_follow_up"] = Field(
        "weekly_email",
        description="Type of reminder to enqueue.",
    )


def authenticate_user(credentials: LoginCredentials = Depends()) -> str:
    if credentials.username != API_USERNAME or credentials.password != API_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.username


def create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    payload = {
        "sub": subject,
        "type": token_type,
        "exp": datetime.utcnow() + expires_delta,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    if payload.get("type") != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    payload = decode_token(token, "access")
    subject = payload.get("sub")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject is missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return subject


def get_refresh_user(token: str = Depends(oauth2_scheme)) -> str:
    payload = decode_token(token, "refresh")
    subject = payload.get("sub")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject is missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return subject


@app.post("/api/token", response_model=TokenResponse)
def issue_token(user: str = Depends(authenticate_user)) -> TokenResponse:
    access_expires = timedelta(minutes=JWT_ACCESS_EXPIRE_MINUTES)
    refresh_expires = timedelta(days=JWT_REFRESH_EXPIRE_DAYS)
    return TokenResponse(
        access_token=create_token(user, "access", access_expires),
        refresh_token=create_token(user, "refresh", refresh_expires),
        token_type="bearer",
        expires_in=int(access_expires.total_seconds()),
    )


@app.post("/api/token/refresh", response_model=TokenResponse)
def refresh_token(user: str = Depends(get_refresh_user)) -> TokenResponse:
    access_expires = timedelta(minutes=JWT_ACCESS_EXPIRE_MINUTES)
    refresh_expires = timedelta(days=JWT_REFRESH_EXPIRE_DAYS)
    return TokenResponse(
        access_token=create_token(user, "access", access_expires),
        refresh_token=create_token(user, "refresh", refresh_expires),
        token_type="bearer",
        expires_in=int(access_expires.total_seconds()),
    )


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


@app.post("/api/reminders/{journey_id}")
def enqueue_reminder(
    journey_id: int,
    payload: ReminderRequest,
    current_user: str = Depends(get_current_user),
):
    if payload.reminder_type == "weekly_email":
        task = send_weekly_reminder.delay(journey_id=journey_id, requested_by=current_user)
        task_type = "weekly_email"
    else:
        task = send_audit_follow_up.delay(journey_id=journey_id, requested_by=current_user)
        task_type = "audit_follow_up"
    return {
        "message": "Reminder queued.",
        "task_id": task.id,
        "journey_id": journey_id,
        "reminder_type": task_type,
    }
