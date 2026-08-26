from typing import Any


def calculate_risk_score(intake: dict, api_data: dict) -> tuple[int, list]:
    """
    Returns (score, tier, score_drivers).
    score: integer 0-100, lower = lower risk.
    Low Risk = 0-35, Moderate Risk = 36-65, High Risk = 66-100.
    """

    score = 0
    drivers = []

    # ── 1. ROOF AGE — highest single weight ─────────────────────────────────
    roof_age = intake.get("roof_age_range", "Unknown")
    roof_map = {
        "Under 5 years":  (-5,  "New roof significantly reduces storm and leak risk"),
        "5-10 years":     (5,   "Roof age is within acceptable range"),
        "10-15 years":    (14,  "Roof approaching mid-life — increased storm vulnerability"),
        "15-20 years":    (22,  "Aging roof is a major risk factor for storm and water damage"),
        "Over 20 years":  (30,  "Roof over 20 years is the single largest risk factor"),
        "Unknown":        (14,  "Roof age unknown — elevated risk assumed per industry standard"),
    }
    delta, reason = roof_map.get(roof_age, (14, "Roof age unknown"))
    score += delta
    drivers.append({"factor": "Roof age", "value": roof_age, "delta": delta, "reason": reason})

    # ── 2. ROOF TYPE ─────────────────────────────────────────────────────────
    roof_type = intake.get("roof_type", "Unknown")
    roof_type_map = {
        "Metal":           -6,
        "Tile or clay":    -4,
        "Asphalt shingle":  3,
        "Flat":             9,
        "Wood shake":      12,
        "Unknown":          6,
    }
    delta = roof_type_map.get(roof_type, 6)
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
                delta = 3
                reason = "Home age is within average range — minor aging risk"
            elif age < 40:
                delta = 9
                reason = "Home is 20–40 years old — systems showing age-related wear"
            elif age < 60:
                delta = 15
                reason = "Home is 40–60 years old — elevated electrical and plumbing risk"
            else:
                delta = 22
                reason = "Home over 60 years old — high structural and systems risk"
            score += delta
            drivers.append({"factor": "Home age", "value": f"Built {year_built}", "delta": delta, "reason": reason})
        except (ValueError, TypeError):
            pass
    else:
        # Unknown home age — apply moderate penalty
        delta = 10
        score += delta
        drivers.append({"factor": "Home age", "value": "Unknown", "delta": delta,
                        "reason": "Home age unknown — moderate risk assumed"})

    # ── 4. CONSTRUCTION TYPE ─────────────────────────────────────────────────
    construction = intake.get("construction_type", "Unknown")
    construction_map = {
        "Brick or masonry": -5,
        "Concrete block":   -3,
        "Wood frame":        8,
        "Unknown":           8,
    }
    delta = construction_map.get(construction, 8)
    score += delta
    if delta != 0:
        reason = (
            f"{construction} construction has {'better' if delta < 0 else 'lower'} fire and wind resistance"
            if construction != "Unknown"
            else "Construction type unknown — wood frame risk assumed per housing stock average"
        )
        drivers.append({"factor": "Construction type", "value": construction, "delta": delta, "reason": reason})

    # ── 5. FLOOD ZONE ────────────────────────────────────────────────────────
    flood = api_data.get("flood_zone", {})
    flood_zone = flood.get("flood_zone", "X")
    flood_risk = flood.get("risk_level", "Minimal Risk")
    flood_map = {
        "High Risk":           18,
        "High Risk (Coastal)": 24,
        "Moderate Risk":        9,
        "Minimal Risk":         0,
        "Undetermined Risk":    6,
        "Unknown":              5,
    }
    delta = flood_map.get(flood_risk, 5)
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
        "Moderate Risk":  5,
        "Elevated Risk": 12,
        "High Risk":     18,
        "Unknown":        6,
    }
    delta = fire_map.get(fire_risk, 6)
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
        "Extreme Weather Risk":  22,
        "Severe Weather Risk":   16,
        "Moderate Weather Risk":  9,
        "Minor Weather Risk":     5,
        "No Active Alerts":       0,
        "Unable to retrieve":     3,
    }
    delta = weather_map.get(weather_risk, 3)
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
        "Moderate Risk":  6,
        "Elevated Risk": 11,
        "High Risk":     16,
        "Unknown":        5,
    }
    delta = crime_map.get(crime_risk, 5)
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
        "Low":           3,
        "Moderate":      9,
        "High":         16,
        "Very High":    22,
        "Unknown":       3,
    }
    delta = wildfire_map.get(wildfire_risk, 3)
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
        delta = -10
        score += delta
        drivers.append({
            "factor": "Monitored security system",
            "value": "Present",
            "delta": delta,
            "reason": "Monitored alarm reduces theft and liability risk significantly"
        })
    elif security == "Unmonitored alarm only":
        delta = -4
        score += delta
        drivers.append({
            "factor": "Unmonitored alarm",
            "value": "Present",
            "delta": delta,
            "reason": "Unmonitored alarm provides partial theft deterrence"
        })
    else:
        delta = 8
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
        "No":                 9,
        "Not sure":           5,
    }
    delta = smoke_map.get(smoke, 5)
    score += delta
    if delta != 0:
        reason = (
            "Smoke detectors on every floor significantly reduce fire fatality and damage risk"
            if delta < 0 else
            "Missing or uncertain smoke detector coverage increases fire risk"
        )
        drivers.append({"factor": "Smoke detectors", "value": smoke, "delta": delta, "reason": reason})

    # ── 12. WATER SENSORS ────────────────────────────────────────────────────
    water_sensors = intake.get("has_water_sensors", "No")
    if water_sensors == "Yes":
        delta = -6
        score += delta
        drivers.append({
            "factor": "Water leak sensors",
            "value": "Present",
            "delta": delta,
            "reason": "Smart leak sensors catch water damage early — the #1 non-catastrophe claim driver"
        })
    elif water_sensors == "No":
        delta = 7
        score += delta
        drivers.append({
            "factor": "No water leak sensors",
            "value": "Absent",
            "delta": delta,
            "reason": "Water damage is the leading non-catastrophe claim driver — sensors are high-value"
        })
    else:
        delta = 4
        score += delta
        drivers.append({
            "factor": "Water leak sensors",
            "value": "Unknown",
            "delta": delta,
            "reason": "Water sensor presence unknown — moderate risk assumed"
        })

    # ── 13. FIRE EXTINGUISHER ────────────────────────────────────────────────
    extinguisher = intake.get("has_fire_extinguisher", "No")
    ext_map = {
        "Yes":          -3,
        "Kitchen only": -1,
        "No":            5,
        "Not sure":      3,
    }
    delta = ext_map.get(extinguisher, 3)
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
        "Both":               -10,
        "Sump pump only":      -5,
        "Storm shutters only": -5,
        "Neither":              7,
        "Not applicable":       0,
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
        "1 claim":   12,
        "2 claims":  22,
        "3 or more": 32,
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
        "Excellent":        -12,
        "Good":              -6,
        "Fair":               8,
        "Poor":              16,
        "Prefer not to say":  4,
    }
    delta = credit_map.get(credit, 4)
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

    drivers.sort(key=lambda x: x["delta"], reverse=True)

    return score, tier, drivers

def calculate_components(intake: dict, api_data: dict, drivers: list) -> list:
    """
    Groups score drivers into 5 display categories for the frontend bar chart.
    Each category shows how much of the total score came from that area.
    """
    category_map = {
        "location": ["Flood zone", "Distance to fire station", "Neighborhood crime", "Wildfire risk"],
        "property": ["Roof age", "Roof type", "Home age", "Construction type"],
        "weather":  ["Active weather alerts"],
        "behavior": ["Monitored security system", "Unmonitored alarm", "No security system",
                     "Smoke detectors", "Water leak sensors", "No water leak sensors",
                     "Fire extinguisher", "Flood/storm mitigation", "Prior claims history"],
        "financial": ["Credit tier"],
    }

    # Sum deltas per category from actual drivers
    totals = {"location": 0, "property": 0, "weather": 0, "behavior": 0, "financial": 0}
    for driver in drivers:
        factor = driver["factor"]
        for cat, factors in category_map.items():
            if any(f.lower() in factor.lower() or factor.lower() in f.lower() for f in factors):
                totals[cat] += driver["delta"]
                break

    # Max possible points per category (used for bar scaling)
    maxes = {"location": 30, "property": 30, "weather": 22, "behavior": 20, "financial": 16}

    labels = {
        "location": "Location Risk",
        "property": "Property Risk",
        "weather":  "Weather Exposure",
        "behavior": "Behavior & Maintenance",
        "financial": "Financial Stability",
    }

    components = []
    for cat in ["location", "property", "weather", "behavior", "financial"]:
        raw = totals[cat]
        clamped = max(0, min(maxes[cat], raw))
        components.append({
            "label": labels[cat],
            "score": clamped,
            "max": maxes[cat],
        })

    return components