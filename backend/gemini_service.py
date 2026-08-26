import os
import json
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "models/gemini-2.5-flash"


def generate_risk_insights(risk_profile: dict, score: int, score_drivers: list) -> dict:
    prompt = f"""
You are a home insurance risk advisor helping a homeowner understand their property risk.

Here is the homeowner's profile:
{json.dumps(risk_profile, indent=2)}

Their overall risk score is {score} out of 100. Lower is better.
A score of 0-35 is Low Risk, 36-65 is Moderate Risk, 66-100 is High Risk.

Here are the factors that most influenced their score:
{json.dumps(score_drivers, indent=2)}

Your job is to return a JSON object with exactly this structure.
Return ONLY raw JSON. No markdown, no code blocks, no explanation outside the JSON.

{{
  "summary": "A 2-3 sentence plain English explanation of what their score means and what is driving it most. Be specific to their actual data, not generic.",
  "risk_tier": "Low Risk or Moderate Risk or High Risk",
  "recommendations": [
    {{
      "action": "Short action title",
      "why": "One sentence explaining why this reduces their specific risk",
      "score_impact": -8,
      "effort": "Easy",
      "cost": "$25-50",
      "tier": "quick_win"
    }}
  ]
}}

Rules:
- Return exactly 5 recommendations
- Rank them by score_impact (most negative number first — those help the most)
- tier must be one of: quick_win, medium_effort, high_impact
- effort must be one of: Easy, Moderate, Significant
- score_impact must be a negative integer (it reduces the score)
- Be specific to the user's location, home age, and actual risk drivers
- Do not recommend things the user already has (check their profile)
- Do not mention premiums, insurance pricing, or dollar claim amounts
"""

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt
    )

    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    return json.loads(raw)


def generate_weather_alert_message(alert_data: dict, risk_profile: dict) -> str:
    prompt = f"""
You are a home safety advisor. A weather alert has been issued for a homeowner's area.

Weather alert details:
{json.dumps(alert_data, indent=2)}

Homeowner's relevant profile:
- Roof age range: {risk_profile.get('roof_age')}
- Roof material: {risk_profile.get('roof_material')}
- Has storm shutters: {risk_profile.get('has_storm_shutters', False)}
- Flood zone: {risk_profile.get('flood_zone')}
- Has sump pump: {risk_profile.get('has_sump_pump', False)}

Write a 2-3 sentence personalized alert message for their dashboard.
Be specific to their home's actual vulnerabilities given this alert type.
Be calm, practical, and actionable. Do not be alarmist.
Return only the message text, no JSON, no formatting.
"""

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt
    )
    return response.text.strip()


def generate_goal_completion_message(completed_action: str, new_score: int, old_score: int) -> str:
    prompt = f"""
A homeowner just completed this home safety action: "{completed_action}"
Their risk score dropped from {old_score} to {new_score}.

Write a single encouraging sentence (max 20 words) congratulating them
and reinforcing why this action matters for their home safety.
Return only the sentence, no formatting.
"""

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt
    )
    return response.text.strip()


def should_generate_weather_alert(weather_data: dict) -> bool:
    return (
        weather_data.get("alert_count", 0) > 0
        and weather_data.get("risk_level") not in ["No Active Alerts", "Unable to retrieve"]
    )

def extract_intake_from_transcript(transcript: str) -> dict:
    """
    Takes the raw ElevenLabs conversation transcript and uses Gemini
    to extract the structured intake answers from it.
    """
    prompt = f"""
You are a data extraction assistant. Below is a conversation transcript between 
a user and an AI home risk assessment assistant named Jake.

Extract the homeowner's answers from this transcript and return them as a JSON object.
Return ONLY raw JSON. No markdown, no code blocks, no explanation outside the JSON.

Transcript:
{transcript}

Return exactly this structure, using null for any field not mentioned:
{{
  "address": "full property address as stated by user or null",
  "year_built": integer year or null,
  "construction_type": "Wood frame or Brick or masonry or Concrete block or Unknown or null",
  "roof_type": "Asphalt shingle or Metal or Tile or clay or Flat or Wood shake or Unknown or null",
  "roof_age_range": "Under 5 years or 5-10 years or 10-15 years or 15-20 years or Over 20 years or Unknown or null",
  "square_footage_range": "Under 1000 or 1000-1500 or 1500-2500 or 2500-4000 or Over 4000 or null",
  "has_security_system": "Yes or No or Unmonitored alarm only or null",
  "smoke_detectors": "Yes, every floor or Some floors only or No or Not sure or null",
  "has_water_sensors": "Yes or No or Not sure or null",
  "has_fire_extinguisher": "Yes or Kitchen only or No or Not sure or null",
  "flood_storm_mitigation": "Sump pump only or Storm shutters only or Both or Neither or Not applicable or null",
  "prior_claims_count": "None or 1 claim or 2 claims or 3 or more or null",
  "prior_claims_type": "Wind or hail or Water damage or Fire or Theft or Liability or Other or N/A or null",
  "credit_tier": "Excellent or Good or Fair or Poor or Prefer not to say or null",
  "email": "email address or null"
}}

Rules:
- Only extract what the user explicitly stated — do not infer or assume
- If the user said they don't know, use the closest Unknown or Not sure value
- For address, capture exactly what the user said including street number, street, city, state
- For year_built, return an integer like 1997, not a string
- If a field was skipped or not discussed, return null
"""

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt
    )

    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    intake = json.loads(raw)

    # Replace null values with sensible defaults so scoring doesn't break
    defaults = {
        "construction_type": "Unknown",
        "roof_type": "Unknown",
        "roof_age_range": "Unknown",
        "has_security_system": "No",
        "smoke_detectors": "Not sure",
        "has_water_sensors": "Not sure",
        "has_fire_extinguisher": "Not sure",
        "flood_storm_mitigation": "Neither",
        "prior_claims_count": "None",
        "prior_claims_type": "N/A",
        "credit_tier": "Prefer not to say",
        "email": ""
    }

    for key, default in defaults.items():
        if intake.get(key) is None:
            intake[key] = default

    return intake

def generate_seasonal_alert(location: str, weather_risk: str, month: int) -> str:
    """
    Generates a seasonal home maintenance tip relevant to the location and time of year.
    """
    seasons = {
        12: "winter", 1: "winter", 2: "winter",
        3: "spring",  4: "spring", 5: "spring",
        6: "summer",  7: "summer", 8: "summer",
        9: "fall",   10: "fall",  11: "fall",
    }
    season = seasons.get(month, "spring")

    prompt = f"""
You are a home safety advisor. Generate a single short seasonal home maintenance tip (max 15 words).

Location: {location}
Current season: {season}
Weather risk level: {weather_risk}

Return only the tip text. No punctuation at the end. No formatting. No emojis.
Example: Pre-summer checklist active — inspect roof, clear gutters, check AC
"""
    response = client.models.generate_content(model=MODEL, contents=prompt)
    return response.text.strip()