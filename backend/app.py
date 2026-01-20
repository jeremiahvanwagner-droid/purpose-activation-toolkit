"""
FastAPI application for the Purpose Activation Toolkit.

This backend serves a minimal set of API endpoints to power interactive
features in the frontend such as submitting intention statements,
evaluating purpose audits and retrieving curated resources. It is
designed to be a foundation upon which more complex functionality
could be built, including database integration, authentication and
external integrations (e.g. email reminders, mentorship scheduling).
"""

import os

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

app = FastAPI(title="Purpose Activation Toolkit API", version="0.1.0")


def get_integration_links():
    """Load external integration links from environment variables."""
    return [
        {
            "key": "beyond_the_veil",
            "label": "Beyond the Veil",
            "description": "Step into the Beyond the Veil experience and deepen your spiritual practice.",
            "url": os.getenv("BEYOND_THE_VEIL_URL", "https://example.com/beyond-the-veil"),
        },
        {
            "key": "calendly",
            "label": "Book a Purpose Activation Call",
            "description": "Schedule a 1:1 session to explore your next purpose-aligned steps.",
            "url": os.getenv("CALENDLY_URL", "https://calendly.com/your-link"),
        },
        {
            "key": "skool",
            "label": "Join the Skool Community",
            "description": "Connect with the community for accountability, live sessions, and growth.",
            "url": os.getenv("SKOOL_URL", "https://www.skool.com/your-community"),
        },
        {
            "key": "bookstore",
            "label": "Visit the Bookstore",
            "description": "Browse curated books and tools to support your purpose journey.",
            "url": os.getenv("BOOKSTORE_URL", "https://example.com/bookstore"),
        },
    ]


class Intention(BaseModel):
    """Model for capturing intention submissions."""
    user_id: Optional[str] = Field(None, description="User identifier (optional)")
    statement: str = Field(..., description="User's intention or purpose statement")


class AuditResponse(BaseModel):
    """Response model for audit results."""
    score: int
    description: str
    mentorship_recommended: bool


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


@app.get("/api/integrations")
async def get_integrations():
    """Return external integration links for frontend CTAs."""
    return {"integrations": get_integration_links()}
