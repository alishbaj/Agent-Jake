import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from database import init_db, migrate_db, save_assessment, get_assessment, get_all_assessments, get_assessments_by_email
from apis import (
    get_coordinates,
    get_flood_zone,
    get_fire_station,
    get_weather_alerts,
    get_census_data,
    get_property_details,
    get_crime_data,
    get_wildfire_risk
)
from scoring import calculate_risk_score
from gemini_service import (
    generate_risk_insights,
    generate_weather_alert_message,
    generate_goal_completion_message,
    should_generate_weather_alert
)

load_dotenv()

app = FastAPI(title="AgentJake Risk Assessment API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.on_event("startup")
def startup():
    init_db()
    migrate_db()


# ── Root ─────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "AgentJake Risk Assessment API is running"}


# ── Test endpoints ────────────────────────────────────────────────────────────

@app.get("/test/geocode")
async def test_geocode(address: str = "2835 Gibraltar St, Irving, TX 75062"):
    return await get_coordinates(address)

@app.get("/test/flood")
async def test_flood(lat: float = 32.8452443, lng: float = -97.0120737):
    return await get_flood_zone(lat, lng)

@app.get("/test/firestation")
async def test_firestation(lat: float = 32.8452443, lng: float = -97.0120737):
    return await get_fire_station(lat, lng)

@app.get("/test/weather")
async def test_weather(lat: float = 32.8452443, lng: float = -97.0120737):
    return await get_weather_alerts(lat, lng)

@app.get("/test/census")
async def test_census(zip_code: str = "75062"):
    return await get_census_data(zip_code)

@app.get("/test/property")
async def test_property(address: str = "2835 Gibraltar St, Irving, TX 75062"):
    return await get_property_details(address)

@app.get("/test/crime")
async def test_crime(city: str = "Irving", state: str = "TX"):
    return await get_crime_data(city, state)

@app.get("/test/wildfire")
async def test_wildfire(lat: float = 32.8452443, lng: float = -97.0120737):
    return await get_wildfire_risk(lat, lng)


# ── Full location pipeline (no scoring, just raw data) ───────────────────────

@app.get("/location-data")
async def location_data(address: str):
    coords = await get_coordinates(address)
    if "error" in coords:
        raise HTTPException(status_code=400, detail=coords["error"])

    lat = coords["lat"]
    lng = coords["lng"]
    zip_code = coords.get("zip_code", "")
    formatted = coords.get("formatted_address", "")
    parts = formatted.split(",")
    city = parts[1].strip() if len(parts) > 1 else ""
    state = parts[2].strip().split()[0] if len(parts) > 2 else ""

    flood, fire, weather, census, property_details, crime, wildfire = await asyncio.gather(
        get_flood_zone(lat, lng),
        get_fire_station(lat, lng),
        get_weather_alerts(lat, lng),
        get_census_data(zip_code),
        get_property_details(coords.get("formatted_address", address)),
        get_crime_data(city, state),
        get_wildfire_risk(lat, lng)
    )

    return {
        "address": address,
        "formatted_address": formatted,
        "coordinates": {"lat": lat, "lng": lng},
        "zip_code": zip_code,
        "flood_zone": flood,
        "fire_station": fire,
        "weather_alerts": weather,
        "census": census,
        "property_details": property_details,
        "crime": crime,
        "wildfire": wildfire
    }


# ── Main assessment endpoint ──────────────────────────────────────────────────

class AssessmentRequest(BaseModel):
    # Location
    address: str

    # Jake intake — property details
    year_built: Optional[int] = None
    construction_type: Optional[str] = ""
    roof_type: Optional[str] = ""
    roof_age_range: Optional[str] = ""
    square_footage_range: Optional[str] = ""

    # Jake intake — safety devices
    has_security_system: Optional[str] = "No"
    smoke_detectors: Optional[str] = "Not sure"
    has_water_sensors: Optional[str] = "No"
    has_fire_extinguisher: Optional[str] = "No"
    flood_storm_mitigation: Optional[str] = "Neither"

    # Jake intake — risk history
    prior_claims_count: Optional[str] = "None"
    prior_claims_type: Optional[str] = "N/A"

    # Jake intake — financial
    credit_tier: Optional[str] = "Prefer not to say"

    # Account
    email: Optional[str] = ""


@app.post("/api/assess")
async def create_assessment(request: AssessmentRequest):

    # ── Step 1: Geocode the address ───────────────────────────────────────
    coords = await get_coordinates(request.address)
    if "error" in coords:
        raise HTTPException(status_code=400, detail=coords["error"])

    lat = coords["lat"]
    lng = coords["lng"]
    zip_code = coords.get("zip_code", "")
    formatted = coords.get("formatted_address", request.address)
    parts = formatted.split(",")
    city = parts[1].strip() if len(parts) > 1 else ""
    state = parts[2].strip().split()[0] if len(parts) > 2 else ""

    # ── Step 2: Run all API enrichments in parallel ───────────────────────
    flood, fire, weather, census, property_details, crime, wildfire = await asyncio.gather(
        get_flood_zone(lat, lng),
        get_fire_station(lat, lng),
        get_weather_alerts(lat, lng),
        get_census_data(zip_code),
        get_property_details(formatted),
        get_crime_data(city, state),
        get_wildfire_risk(lat, lng)
    )

    api_data = {
        "flood_zone": flood,
        "fire_station": fire,
        "weather_alerts": weather,
        "census": census,
        "property_details": property_details,
        "crime": crime,
        "wildfire": wildfire
    }

    # ── Step 3: Build intake dict for scoring ─────────────────────────────
    # Use ATTOM year_built if user didn't provide it
    attom_year = property_details.get("year_built") if property_details else None
    resolved_year_built = request.year_built or attom_year

    intake = {
        "year_built": resolved_year_built,
        "construction_type": request.construction_type,
        "roof_type": request.roof_type,
        "roof_age_range": request.roof_age_range,
        "square_footage_range": request.square_footage_range,
        "has_security_system": request.has_security_system,
        "smoke_detectors": request.smoke_detectors,
        "has_water_sensors": request.has_water_sensors,
        "has_fire_extinguisher": request.has_fire_extinguisher,
        "flood_storm_mitigation": request.flood_storm_mitigation,
        "prior_claims_count": request.prior_claims_count,
        "prior_claims_type": request.prior_claims_type,
        "credit_tier": request.credit_tier,
    }

    # ── Step 4: Calculate risk score ──────────────────────────────────────
    score, tier, score_drivers = calculate_risk_score(intake, api_data)

    # ── Step 5: Generate Gemini insights ──────────────────────────────────
    risk_profile_for_gemini = {
        "address": formatted,
        "year_built": resolved_year_built,
        "construction_type": request.construction_type,
        "roof_type": request.roof_type,
        "roof_age_range": request.roof_age_range,
        "flood_zone": flood.get("flood_zone"),
        "flood_risk_level": flood.get("risk_level"),
        "fire_station_distance_miles": fire.get("distance_miles"),
        "weather_risk": weather.get("risk_level"),
        "wildfire_risk": wildfire.get("risk_level"),
        "crime_risk": crime.get("risk_level"),
        "has_security_system": request.has_security_system,
        "smoke_detectors": request.smoke_detectors,
        "has_water_sensors": request.has_water_sensors,
        "has_fire_extinguisher": request.has_fire_extinguisher,
        "flood_storm_mitigation": request.flood_storm_mitigation,
        "prior_claims_count": request.prior_claims_count,
        "prior_claims_type": request.prior_claims_type,
        "credit_tier": request.credit_tier,
    }

    try:
        gemini_result = generate_risk_insights(
            risk_profile=risk_profile_for_gemini,
            score=score,
            score_drivers=score_drivers
        )
        gemini_summary = gemini_result.get("summary", "")
        gemini_recommendations = gemini_result.get("recommendations", [])
    except Exception as e:
        print(f"Gemini error: {e}")
        gemini_summary = "Risk assessment complete. See your score breakdown below."
        gemini_recommendations = []

    # ── Step 6: Generate weather alert message if alerts are active ───────
    weather_alert_message = None
    if should_generate_weather_alert(weather):
        try:
            weather_alert_message = generate_weather_alert_message(
                alert_data=weather,
                risk_profile={
                    "roof_age": request.roof_age_range,
                    "roof_material": request.roof_type,
                    "has_storm_shutters": "storm shutters" in (request.flood_storm_mitigation or "").lower(),
                    "flood_zone": flood.get("flood_zone"),
                    "has_sump_pump": "sump pump" in (request.flood_storm_mitigation or "").lower(),
                }
            )
        except Exception as e:
            print(f"Gemini weather alert error: {e}")

    # ── Step 7: Save to database ──────────────────────────────────────────
    assessment_data = {
        "address": request.address,
        "formatted_address": formatted,
        "zip_code": zip_code,
        "lat": lat,
        "lng": lng,
        "flood_zone": flood,
        "fire_station": fire,
        "weather_alerts": weather,
        "census": census,
        "property_details": property_details,
        "crime": crime,
        "wildfire": wildfire,
        "year_built": resolved_year_built,
        "construction_type": request.construction_type,
        "roof_type": request.roof_type,
        "roof_age_range": request.roof_age_range,
        "square_footage_range": request.square_footage_range,
        "has_security_system": request.has_security_system,
        "smoke_detectors": request.smoke_detectors,
        "has_water_sensors": request.has_water_sensors,
        "has_fire_extinguisher": request.has_fire_extinguisher,
        "flood_storm_mitigation": request.flood_storm_mitigation,
        "prior_claims_count": request.prior_claims_count,
        "prior_claims_type": request.prior_claims_type,
        "credit_tier": request.credit_tier,
        "email": request.email,
        "risk_score": score,
        "risk_tier": tier,
        "score_drivers": score_drivers,
        "gemini_summary": gemini_summary,
        "gemini_recommendations": gemini_recommendations,
        "full_assessment": {
            **api_data,
            "intake": intake,
            "score": score,
            "tier": tier,
            "drivers": score_drivers,
            "gemini_summary": gemini_summary,
            "recommendations": gemini_recommendations,
            "weather_alert_message": weather_alert_message,
        }
    }

    assessment_id = save_assessment(assessment_data)

    # ── Step 8: Return everything the frontend needs ───────────────────────
    return {
        "assessment_id": assessment_id,
        "score": score,
        "risk_tier": tier,
        "score_drivers": score_drivers,
        "summary": gemini_summary,
        "recommendations": gemini_recommendations,
        "weather_alert_message": weather_alert_message,
        "api_data": api_data,
        "attom_prefill": {
            "year_built": attom_year,
            "square_footage": property_details.get("square_footage_living") if property_details else None,
            "property_type": property_details.get("property_type") if property_details else None,
        }
    }


# ── Goal completion endpoint ──────────────────────────────────────────────────

class GoalCompleteRequest(BaseModel):
    action: str
    old_score: int
    new_score: int

@app.post("/api/goal-complete")
async def goal_complete(request: GoalCompleteRequest):
    try:
        message = generate_goal_completion_message(
            completed_action=request.action,
            new_score=request.new_score,
            old_score=request.old_score
        )
        return {"message": message}
    except Exception as e:
        return {"message": "Great work — every action brings your risk score down."}


# ── Retrieval endpoints ───────────────────────────────────────────────────────

@app.get("/assessment/{assessment_id}")
async def get_assessment_by_id(assessment_id: int):
    result = get_assessment(assessment_id)
    if not result:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return result

@app.get("/assessments")
async def list_assessments():
    return get_all_assessments()

@app.get("/assessments/by-email/{email}")
async def get_by_email(email: str):
    return get_assessments_by_email(email)