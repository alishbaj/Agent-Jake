from typing import Any


def calculate_risk_score(intake: dict, api_data: dict) -> tuple[int, list]:
    """
    Returns (score, score_drivers).
    score: integer 0-100, lower = lower risk.
    score_drivers: list of dicts explaining what raised/lowered the score.
    Lower score = better. High Risk = 66-100, Moderate = 36-65, Low = 0-35.
    """

    score = 0
    drivers = []

    # ── 1. ROOF AGE — highest single weight ─────────────────────────────────
    roof_age = intake.get("roof_age_range", "Unknown")
    roof_map = {
        "Under 5 years":  (-5,  "New roof significantly reduces storm and leak risk"),
        "5-10 years":     (0,   "Roof age is within expected range"),
        "10-15 years":    (8,   "Roof is approaching mid-life — worth monitoring"),
        "15-20 years":    (16,  "Roof age is elevated — major risk factor for storm damage"),
        "Over 20 years":  (24,  "Roof over 20 years is the single largest risk factor"),
        "Unknown":        (10,  "Roof age unknown — moderate risk assumed"),
    }
    delta, reason = roof_map.get(roof_age, (10, "Roof age unknown"))
    score += delta
    drivers.append({"factor": "Roof age", "value": roof_age, "delta": delta, "reason": reason})

    # ── 2. ROOF TYPE ─────────────────────────────────────────────────────────
    roof_type = intake.get("roof_type", "Unknown")
    roof_type_map = {
        "Metal":          -6,
        "Tile or clay":   -4,
        "Asphalt shingle": 0,
        "Flat":            6,
        "Wood shake":      8,
        "Unknown":         3,
    }
    delta = roof_type_map.get(roof_type, 3)
    score += delta
    if delta != 0:
        reason = f"{roof_type} roofs have {'lower' if delta < 0 else 'higher'} vulnerability to storm and hail damage"
        drivers.append({"factor": "Roof type", "value": roof_type, "delta": delta, "reason": reason})

    # ── 3. HOME AGE ──────────────────────────────────────────────────────────
    attom = api_data.get("property_details", {})
    year_built = intake.get("year_built") or attom.get("year_built")
    if year_built:
        try:
            age = 2025 - int(year_built)
            if age < 10:
                delta = -4
                reason = "Home built within last 10 years — modern building codes reduce risk"
            elif age < 20:
                delta = 0
                reason = "Home age is within average range"
            elif age < 40:
                delta = 5
                reason = "Home is 20–40 years old — some systems may be aging"
            elif age < 60:
                delta = 10
                reason = "Home is 40–60 years old — electrical and plumbing risk increases"
            else:
                delta = 16
                reason = "Home over 60 years old — elevated structural and systems risk"
            score += delta
            drivers.append({"factor": "Home age", "value": f"Built {year_built}", "delta": delta, "reason": reason})
        except (ValueError, TypeError):
            pass

    # ── 4. CONSTRUCTION TYPE ─────────────────────────────────────────────────
    construction = intake.get("construction_type", "Unknown")
    construction_map = {
        "Brick or masonry": -5,
        "Concrete block":   -3,
        "Wood frame":        5,
        "Unknown":           2,
    }
    delta = construction_map.get(construction, 2)
    score += delta
    if delta != 0:
        reason = f"{construction} construction has {'better' if delta < 0 else 'lower'} fire and wind resistance"
        drivers.append({"factor": "Construction type", "value": construction, "delta": delta, "reason": reason})

    # ── 5. FLOOD ZONE ────────────────────────────────────────────────────────
    flood = api_data.get("flood_zone", {})
    flood_zone = flood.get("flood_zone", "X")
    flood_risk = flood.get("risk_level", "Minimal Risk")
    flood_map = {
        "High Risk":           14,
        "High Risk (Coastal)": 18,
        "Moderate Risk":        6,
        "Minimal Risk":         0,
        "Undetermined Risk":    4,
        "Unknown":              3,
    }
    delta = flood_map.get(flood_risk, 3)
    score += delta
    if delta > 0:
        drivers.append({
            "factor": "Flood zone",
            "value": f"Zone {flood_zone} — {flood_risk}",
            "delta": delta,
            "reason": f"FEMA designates this property as {flood_risk} for flooding"
        })

    # ── 6. FIRE STATION DISTANCE ─────────────────────────────────────────────
    fire = api_data.get("fire_station", {})
    fire_risk = fire.get("risk_level", "Unknown")
    distance_miles = fire.get("distance_miles")
    fire_map = {
        "Low Risk":      -3,
        "Moderate Risk":  3,
        "Elevated Risk":  8,
        "High Risk":     14,
        "Unknown":        4,
    }
    delta = fire_map.get(fire_risk, 4)
    score += delta
    distance_str = f"{distance_miles} miles" if distance_miles else "unknown distance"
    drivers.append({
        "factor": "Distance to fire station",
        "value": distance_str,
        "delta": delta,
        "reason": f"Nearest fire station is {distance_str} away — {fire_risk.lower()} for fire response time"
    })

    # ── 7. WEATHER ALERTS ────────────────────────────────────────────────────
    weather = api_data.get("weather_alerts", {})
    weather_risk = weather.get("risk_level", "No Active Alerts")
    weather_map = {
        "Extreme Weather Risk":  18,
        "Severe Weather Risk":   12,
        "Moderate Weather Risk":  6,
        "Minor Weather Risk":     3,
        "No Active Alerts":       0,
        "Unable to retrieve":     2,
    }
    delta = weather_map.get(weather_risk, 2)
    score += delta
    if delta > 0:
        alert_count = weather.get("alert_count", 0)
        drivers.append({
            "factor": "Active weather alerts",
            "value": f"{alert_count} active alert(s)",
            "delta": delta,
            "reason": f"{weather_risk} detected for this location right now"
        })

    # ── 8. CRIME RATE ────────────────────────────────────────────────────────
    crime = api_data.get("crime", {})
    crime_risk = crime.get("risk_level", "Unknown")
    crime_map = {
        "Low Risk":      -2,
        "Moderate Risk":  3,
        "Elevated Risk":  7,
        "High Risk":     12,
        "Unknown":        2,
    }
    delta = crime_map.get(crime_risk, 2)
    score += delta
    if delta != 0:
        rate = crime.get("property_crime_rate_per_100k")
        rate_str = f"{rate} per 100k" if rate else "unavailable"
        drivers.append({
            "factor": "Neighborhood crime",
            "value": f"{crime_risk} ({rate_str})",
            "delta": delta,
            "reason": f"Property crime rate for this area is {crime_risk.lower()}"
        })

    # ── 9. WILDFIRE RISK ─────────────────────────────────────────────────────
    wildfire = api_data.get("wildfire", {})
    wildfire_risk = wildfire.get("risk_level", "Unknown")
    wildfire_map = {
        "Very Low":      0,
        "Non-burnable":  0,
        "Low":           2,
        "Moderate":      6,
        "High":         12,
        "Very High":    18,
        "Unknown":       2,
    }
    delta = wildfire_map.get(wildfire_risk, 2)
    score += delta
    if delta > 0:
        drivers.append({
            "factor": "Wildfire risk",
            "value": wildfire_risk,
            "delta": delta,
            "reason": f"USFS rates this area as {wildfire_risk.lower()} wildfire hazard potential"
        })

    # ── 10. SECURITY SYSTEM ──────────────────────────────────────────────────
    security = intake.get("has_security_system", "No")
    if security == "Yes":
        delta = -8
        score += delta
        drivers.append({
            "factor": "Monitored security system",
            "value": "Present",
            "delta": delta,
            "reason": "Monitored alarm reduces theft and liability risk significantly"
        })
    elif security == "Unmonitored alarm only":
        delta = -3
        score += delta
        drivers.append({
            "factor": "Unmonitored alarm",
            "value": "Present",
            "delta": delta,
            "reason": "Unmonitored alarm provides partial theft deterrence"
        })
    else:
        delta = 5
        score += delta
        drivers.append({
            "factor": "No security system",
            "value": "Absent",
            "delta": delta,
            "reason": "No security system increases theft and liability exposure"
        })

    # ── 11. SMOKE DETECTORS ──────────────────────────────────────────────────
    smoke = intake.get("smoke_detectors", "Not sure")
    smoke_map = {
        "Yes, every floor":  -5,
        "Some floors only":  -2,
        "No":                 6,
        "Not sure":           2,
    }
    delta = smoke_map.get(smoke, 2)
    score += delta
    if delta != 0:
        reason = (
            "Smoke detectors on every floor significantly reduce fire fatality and damage risk"
            if delta < 0 else
            "Missing or incomplete smoke detector coverage increases fire risk"
        )
        drivers.append({"factor": "Smoke detectors", "value": smoke, "delta": delta, "reason": reason})

    # ── 12. WATER SENSORS ────────────────────────────────────────────────────
    water_sensors = intake.get("has_water_sensors", "No")
    if water_sensors == "Yes":
        delta = -5
        score += delta
        drivers.append({
            "factor": "Water leak sensors",
            "value": "Present",
            "delta": delta,
            "reason": "Smart leak sensors catch water damage early — the #1 non-catastrophe claim driver"
        })
    elif water_sensors == "No":
        delta = 5
        score += delta
        drivers.append({
            "factor": "No water leak sensors",
            "value": "Absent",
            "delta": delta,
            "reason": "Water damage is the leading non-catastrophe claim driver — sensors are high-value"
        })

    # ── 13. FIRE EXTINGUISHER ────────────────────────────────────────────────
    extinguisher = intake.get("has_fire_extinguisher", "No")
    ext_map = {
        "Yes":          -3,
        "Kitchen only": -1,
        "No":            3,
        "Not sure":      1,
    }
    delta = ext_map.get(extinguisher, 1)
    score += delta
    if delta != 0:
        drivers.append({
            "factor": "Fire extinguisher",
            "value": extinguisher,
            "delta": delta,
            "reason": "Fire extinguisher availability affects early fire containment ability"
        })

    # ── 14. FLOOD/STORM MITIGATION ───────────────────────────────────────────
    mitigation = intake.get("flood_storm_mitigation", "Neither")
    mit_map = {
        "Both":               -8,
        "Sump pump only":     -4,
        "Storm shutters only": -4,
        "Neither":             4,
        "Not applicable":      0,
    }
    delta = mit_map.get(mitigation, 0)
    score += delta
    if delta != 0:
        drivers.append({
            "factor": "Flood/storm mitigation",
            "value": mitigation,
            "delta": delta,
            "reason": f"{mitigation} {'reduces' if delta < 0 else 'increases'} flood and storm vulnerability"
        })

    # ── 15. PRIOR CLAIMS ────────────────────────────────────────────────────
    claims = intake.get("prior_claims_count", "None")
    claims_map = {
        "None":       0,
        "1 claim":    8,
        "2 claims":  16,
        "3 or more": 24,
    }
    delta = claims_map.get(claims, 0)
    score += delta
    if delta > 0:
        drivers.append({
            "factor": "Prior claims history",
            "value": claims,
            "delta": delta,
            "reason": "Claim frequency is a strong predictor of future losses in underwriting models"
        })

    # ── 16. CREDIT TIER ─────────────────────────────────────────────────────
    credit = intake.get("credit_tier", "Prefer not to say")
    credit_map = {
        "Excellent":        -10,
        "Good":              -5,
        "Fair":               5,
        "Poor":              12,
        "Prefer not to say":  0,
    }
    delta = credit_map.get(credit, 0)
    score += delta
    if delta != 0:
        drivers.append({
            "factor": "Credit tier",
            "value": credit,
            "delta": delta,
            "reason": "Credit history is one of the strongest predictors of insurance loss frequency"
        })

    # ── CLAMP AND TIER ───────────────────────────────────────────────────────
    score = max(0, min(100, score))

    if score <= 35:
        tier = "Low Risk"
    elif score <= 65:
        tier = "Moderate Risk"
    else:
        tier = "High Risk"

    # Sort drivers: biggest positive delta first (worst factors),
    # then negative deltas last (best factors)
    drivers.sort(key=lambda x: x["delta"], reverse=True)

    return score, tier, drivers