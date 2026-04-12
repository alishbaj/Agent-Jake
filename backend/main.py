import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from database import init_db, save_assessment, get_assessment, get_all_assessments
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

load_dotenv()

app = FastAPI(title="Risk Assessment API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.on_event("startup")
def startup():
    init_db()


# ── Root ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Risk Assessment API is running"}


# ── Test endpoints ───────────────────────────────────────────────────────────

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


# ── Full location pipeline ───────────────────────────────────────────────────

@app.get("/location-data")
async def location_data(address: str):
    coords = await get_coordinates(address)
    if "error" in coords:
        raise HTTPException(status_code=400, detail=coords["error"])

    lat = coords["lat"]
    lng = coords["lng"]
    zip_code = coords.get("zip_code", "")

    # Extract city and state from formatted address
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
        "formatted_address": coords.get("formatted_address"),
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


# ── Assessment endpoints ─────────────────────────────────────────────────────

class AssessmentRequest(BaseModel):
    address: str
    roof_type: str = ""
    electrical_updated: str = ""
    pipe_material: str = ""
    security_system: str = ""
    liability_features: str = ""
    dog: str = ""
    claims_history: str = ""


@app.post("/assessment")
async def create_assessment(request: AssessmentRequest):
    coords = await get_coordinates(request.address)
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
        get_property_details(coords.get("formatted_address", request.address)),
        get_crime_data(city, state),
        get_wildfire_risk(lat, lng)
    )

    assessment_data = {
        "address": request.address,
        "formatted_address": coords.get("formatted_address"),
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
        "roof_type": request.roof_type,
        "electrical_updated": request.electrical_updated,
        "pipe_material": request.pipe_material,
        "security_system": request.security_system,
        "liability_features": request.liability_features,
        "dog": request.dog,
        "claims_history": request.claims_history,
    }

    assessment_id = save_assessment(assessment_data)

    return {
        "assessment_id": assessment_id,
        "message": "Assessment saved successfully",
        "data": assessment_data
    }


@app.get("/assessment/{assessment_id}")
async def get_assessment_by_id(assessment_id: int):
    result = get_assessment(assessment_id)
    if not result:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return result


@app.get("/assessments")
async def list_assessments():
    return get_all_assessments()