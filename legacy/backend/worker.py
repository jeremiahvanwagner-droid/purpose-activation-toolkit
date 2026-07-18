"""Celery worker configuration for background reminders."""

import os

from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "purpose_activation_toolkit",
    broker=REDIS_URL,
    backend=REDIS_URL,
)


@celery_app.task(name="backend.send_weekly_reminder")
def send_weekly_reminder(journey_id: int, requested_by: str) -> dict:
    """Simulate sending a weekly reminder email."""
    return {
        "journey_id": journey_id,
        "requested_by": requested_by,
        "status": "weekly reminder queued",
    }


@celery_app.task(name="backend.send_audit_follow_up")
def send_audit_follow_up(journey_id: int, requested_by: str) -> dict:
    """Simulate sending an audit follow-up reminder."""
    return {
        "journey_id": journey_id,
        "requested_by": requested_by,
        "status": "audit follow-up queued",
    }
