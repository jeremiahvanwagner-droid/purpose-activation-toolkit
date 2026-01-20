"""Assessment definitions and scoring logic for the Purpose Activation Toolkit."""

from typing import Dict, List


ASSESSMENTS: Dict[str, dict] = {
    "purpose-alignment": {
        "id": "purpose-alignment",
        "name": "Purpose Alignment Check",
        "questions": [
            "I can clearly articulate why my work or daily actions matter.",
            "I regularly connect my choices to a bigger mission or vision.",
            "I feel a sense of fulfillment when I think about my life direction.",
            "I can describe how my strengths serve my purpose.",
        ],
        "scale": {
            "min": 1,
            "max": 5,
            "labels": {
                "1": "Strongly disagree",
                "3": "Neutral",
                "5": "Strongly agree",
            },
        },
        "scoring_logic": (
            "Add the scores together. 80%+ of the maximum suggests strong alignment, "
            "60–79% indicates developing alignment, and below 60% suggests clarity work "
            "would be beneficial."
        ),
        "thresholds": [
            {
                "min_ratio": 0.8,
                "label": "Strong alignment",
                "guidance": "You have a clear sense of purpose. Focus on sustaining your momentum.",
            },
            {
                "min_ratio": 0.6,
                "label": "Developing alignment",
                "guidance": "You are on the path; consider clarifying what matters most.",
            },
            {
                "min_ratio": 0.0,
                "label": "Needs clarity",
                "guidance": "Explore purpose discovery exercises to build clarity.",
            },
        ],
    },
    "energy-vitality": {
        "id": "energy-vitality",
        "name": "Energy & Vitality Scan",
        "questions": [
            "I wake up with a sense of energy most days.",
            "My routines support my physical and emotional well-being.",
            "I have sustainable boundaries that protect my energy.",
            "I feel resilient when stress shows up.",
        ],
        "scale": {
            "min": 1,
            "max": 5,
            "labels": {
                "1": "Rarely true",
                "3": "Sometimes true",
                "5": "Almost always true",
            },
        },
        "scoring_logic": (
            "Calculate the total. 75%+ of the maximum indicates strong vitality, "
            "55–74% indicates moderate vitality, and below 55% suggests a recharge plan."
        ),
        "thresholds": [
            {
                "min_ratio": 0.75,
                "label": "High vitality",
                "guidance": "Your energy practices are working. Keep reinforcing them.",
            },
            {
                "min_ratio": 0.55,
                "label": "Moderate vitality",
                "guidance": "Strengthen one daily ritual that restores your energy.",
            },
            {
                "min_ratio": 0.0,
                "label": "Low vitality",
                "guidance": "Prioritize rest, nutrition, and boundaries to rebuild energy.",
            },
        ],
    },
    "values-action": {
        "id": "values-action",
        "name": "Values in Action",
        "questions": [
            "My calendar reflects what I say I value most.",
            "I can identify one value I honored this week.",
            "I feel proud of how I show up for the people who matter.",
            "I make decisions that align with my long-term values.",
        ],
        "scale": {
            "min": 1,
            "max": 5,
            "labels": {
                "1": "Not yet",
                "3": "Sometimes",
                "5": "Consistently",
            },
        },
        "scoring_logic": (
            "Sum the ratings. 80%+ of the maximum signals strong values alignment, "
            "65–79% suggests growth opportunities, and below 65% indicates a need to realign."
        ),
        "thresholds": [
            {
                "min_ratio": 0.8,
                "label": "Aligned values",
                "guidance": "Your actions consistently reflect your values. Keep celebrating wins.",
            },
            {
                "min_ratio": 0.65,
                "label": "Growing alignment",
                "guidance": "Choose one value to intentionally practice this week.",
            },
            {
                "min_ratio": 0.0,
                "label": "Realignment needed",
                "guidance": "Identify where misalignment happens and make a small corrective shift.",
            },
        ],
    },
    "clarity-commitment": {
        "id": "clarity-commitment",
        "name": "Clarity & Commitment Compass",
        "questions": [
            "I know the next three actions that move me toward my purpose.",
            "I feel committed to following through on my goals.",
            "I review my progress and adjust regularly.",
            "I have support systems that keep me accountable.",
        ],
        "scale": {
            "min": 1,
            "max": 5,
            "labels": {
                "1": "Unclear",
                "3": "Somewhat clear",
                "5": "Very clear",
            },
        },
        "scoring_logic": (
            "Add the responses. 70%+ of the maximum indicates strong clarity and commitment, "
            "50–69% indicates partial clarity, and below 50% suggests creating a concrete plan."
        ),
        "thresholds": [
            {
                "min_ratio": 0.7,
                "label": "Clear and committed",
                "guidance": "Maintain your plan and revisit it weekly.",
            },
            {
                "min_ratio": 0.5,
                "label": "Partially clear",
                "guidance": "Clarify your next steps and identify one accountability partner.",
            },
            {
                "min_ratio": 0.0,
                "label": "Plan needed",
                "guidance": "Draft a simple action plan with milestones and support.",
            },
        ],
    },
}


def list_assessments() -> List[dict]:
    """Return assessment definitions for display in the frontend."""
    return list(ASSESSMENTS.values())


def score_assessment(assessment_id: str, responses: List[int]) -> dict:
    """Score an assessment response list."""
    if assessment_id not in ASSESSMENTS:
        raise KeyError("Assessment not found.")
    assessment = ASSESSMENTS[assessment_id]
    if not responses:
        raise ValueError("No responses provided.")
    if len(responses) != len(assessment["questions"]):
        raise ValueError("Response count does not match the number of questions.")
    min_score = assessment["scale"]["min"]
    max_score = assessment["scale"]["max"]
    if any(not isinstance(r, int) or r < min_score or r > max_score for r in responses):
        raise ValueError(f"Responses must be integers between {min_score} and {max_score}.")
    total = sum(responses)
    max_total = max_score * len(responses)
    ratio = total / max_total
    interpretation = assessment["thresholds"][-1]
    for threshold in assessment["thresholds"]:
        if ratio >= threshold["min_ratio"]:
            interpretation = threshold
            break
    return {
        "assessment_id": assessment_id,
        "score": total,
        "max_score": max_total,
        "average": round(total / len(responses), 2),
        "interpretation": interpretation["label"],
        "guidance": interpretation["guidance"],
    }
