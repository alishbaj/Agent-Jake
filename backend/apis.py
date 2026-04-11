import httpx
import os


# ── 1. Google Geocoding → lat, lng, zip ─────────────────────────────────────

async def get_coordinates(address: str):
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": address,
        "key": os.getenv("GOOGLE_API_KEY")
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()

    if not data.get("results"):
        return {"error": "Address not found", "raw": data}

    result = data["results"][0]
    location = result["geometry"]["location"]

    zip_code = ""
    for component in result.get("address_components", []):
        if "postal_code" in component["types"]:
            zip_code = component["short_name"]
            break

    return {
        "lat": location["lat"],
        "lng": location["lng"],
        "zip_code": zip_code,
        "formatted_address": result.get("formatted_address", address)
    }


# ── 2. FEMA → flood zone ─────────────────────────────────────────────────────

async def get_flood_zone(lat: float, lng: float):
    url = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query"
    params = {
        "geometry": f"{lng},{lat}",
        "geometryType": "esriGeometryPoint",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "FLD_ZONE,ZONE_SUBTY",
        "returnGeometry": "false",
        "f": "json"
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(url, params=params)

        if not response.content or response.status_code != 200:
            return {
                "flood_zone": "Unavailable",
                "zone_subtype": "FEMA did not respond",
                "risk_level": "Unknown",
                "error": f"HTTP {response.status_code}"
            }

        data = response.json()

    except httpx.TimeoutException:
        return {
            "flood_zone": "Unavailable",
            "zone_subtype": "Request timed out",
            "risk_level": "Unknown",
            "error": "FEMA API timed out"
        }
    except Exception as e:
        return {
            "flood_zone": "Unavailable",
            "zone_subtype": "Unexpected error",
            "risk_level": "Unknown",
            "error": str(e)
        }

    if data.get("features"):
        attrs = data["features"][0]["attributes"]
        zone = attrs.get("FLD_ZONE", "X")
        subtype = attrs.get("ZONE_SUBTY", "")

        risk_map = {
            "A": "High Risk",
            "AE": "High Risk",
            "AH": "High Risk",
            "AO": "High Risk",
            "VE": "High Risk (Coastal)",
            "X": "Minimal Risk",
            "D": "Undetermined Risk",
            "B": "Moderate Risk",
            "C": "Minimal Risk"
        }
        risk = risk_map.get(zone, "Unknown")

        return {
            "flood_zone": zone,
            "zone_subtype": subtype,
            "risk_level": risk
        }

    return {
        "flood_zone": "X",
        "zone_subtype": "MINIMAL FLOOD HAZARD",
        "risk_level": "Minimal Risk"
    }


# ── 3. Google Places → nearest fire station ──────────────────────────────────

async def get_fire_station(lat: float, lng: float):
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "rankby": "distance",
        "keyword": "fire station",
        "key": os.getenv("GOOGLE_API_KEY")
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()

    if not data.get("results"):
        return {"error": "No fire stations found", "name": "Unknown", "vicinity": "Unknown"}

    station = data["results"][0]

    dest = station.get("vicinity", "")
    origin = f"{lat},{lng}"
    dist_url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    dist_params = {
        "origins": origin,
        "destinations": dest,
        "key": os.getenv("GOOGLE_API_KEY")
    }

    distance_text = "Unknown"
    distance_miles = None

    async with httpx.AsyncClient() as client:
        dist_response = await client.get(dist_url, params=dist_params)
        dist_data = dist_response.json()

    try:
        element = dist_data["rows"][0]["elements"][0]
        if element["status"] == "OK":
            distance_text = element["distance"]["text"]
            distance_meters = element["distance"]["value"]
            distance_miles = round(distance_meters / 1609.34, 2)
    except (KeyError, IndexError):
        pass

    if distance_miles is not None:
        if distance_miles <= 1:
            risk = "Low Risk"
        elif distance_miles <= 3:
            risk = "Moderate Risk"
        elif distance_miles <= 5:
            risk = "Elevated Risk"
        else:
            risk = "High Risk"
    else:
        risk = "Unknown"

    return {
        "name": station.get("name", "Unknown"),
        "vicinity": station.get("vicinity", "Unknown"),
        "distance": distance_text,
        "distance_miles": distance_miles,
        "risk_level": risk
    }


# ── 4. NWS → weather alerts (no API key needed) ──────────────────────────────

async def get_weather_alerts(lat: float, lng: float):
    headers = {
        "User-Agent": "RiskAssessmentApp/1.0 (contact@youremail.com)",
        "Accept": "application/geo+json"
    }

    # Step 1 — get NWS location info from lat/lng
    point_url = f"https://api.weather.gov/points/{lat},{lng}"
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            point_response = await client.get(point_url, headers=headers)
    except httpx.TimeoutException:
        return {
            "alert_count": 0,
            "alerts": [],
            "risk_level": "Unable to retrieve",
            "error": "NWS timed out on point lookup"
        }
    except Exception as e:
        return {
            "alert_count": 0,
            "alerts": [],
            "risk_level": "Unable to retrieve",
            "error": str(e)
        }

    if point_response.status_code != 200:
        return {
            "alert_count": 0,
            "alerts": [],
            "risk_level": "Unable to retrieve",
            "error": f"NWS point lookup failed: {point_response.status_code}"
        }

    point_data = point_response.json()
    props = point_data.get("properties", {})
    state = props.get("relativeLocation", {}).get("properties", {}).get("state", "")

    # Step 2 — get active alerts for this lat/lng
    alerts_url = "https://api.weather.gov/alerts/active"
    alert_params = {
        "point": f"{lat},{lng}",
        "status": "actual"
    }

    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            alerts_response = await client.get(alerts_url, params=alert_params, headers=headers)
    except httpx.TimeoutException:
        return {
            "alert_count": 0,
            "alerts": [],
            "risk_level": "Unable to retrieve",
            "state": state,
            "error": "NWS timed out on alerts lookup"
        }
    except Exception as e:
        return {
            "alert_count": 0,
            "alerts": [],
            "risk_level": "Unable to retrieve",
            "error": str(e)
        }

    alerts = []
    if alerts_response.status_code == 200:
        alerts_data = alerts_response.json()
        for feature in alerts_data.get("features", []):
            a = feature.get("properties", {})
            alerts.append({
                "event": a.get("event", "Unknown"),
                "severity": a.get("severity", "Unknown"),
                "certainty": a.get("certainty", "Unknown"),
                "headline": a.get("headline", ""),
                "description": a.get("description", "")[:200]
            })

    severity_levels = [a.get("severity", "") for a in alerts]
    if "Extreme" in severity_levels:
        risk = "Extreme Weather Risk"
    elif "Severe" in severity_levels:
        risk = "Severe Weather Risk"
    elif "Moderate" in severity_levels:
        risk = "Moderate Weather Risk"
    elif len(alerts) > 0:
        risk = "Minor Weather Risk"
    else:
        risk = "No Active Alerts"

    return {
        "alert_count": len(alerts),
        "risk_level": risk,
        "state": state,
        "alerts": alerts
    }


# ── 5. US Census → neighborhood median year built ────────────────────────────

async def get_census_data(zip_code: str):
    if not zip_code:
        return {"error": "No zip code provided", "median_year_built": "Unknown"}

    url = "https://api.census.gov/data/2022/acs/acs5"
    params = {
        "get": "B25035_001E",
        "for": f"zip code tabulation area:{zip_code}"
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(url, params=params)

        data = response.json()
        if len(data) > 1:
            year = data[1][0]
            age = 2025 - int(year) if year and year != "-666666666" else None
            return {
                "zip_code": zip_code,
                "median_year_built": year,
                "estimated_age_years": age
            }
    except Exception:
        pass

    return {
        "zip_code": zip_code,
        "median_year_built": "Unknown",
        "estimated_age_years": None
    }


# ── 6. ATTOM → property details ─────────────────────────────────────────────

async def get_property_details(address: str):
    url = "https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/basicprofile"
    headers = {
        "apikey": os.getenv("ATTOM_API_KEY"),
        "Accept": "application/json"
    }
    # ATTOM needs address1 = street, address2 = city+state+zip
    # Try to split on comma if present, otherwise send full address
    parts = address.split(",", 1)
    address1 = parts[0].strip()
    address2 = parts[1].strip() if len(parts) > 1 else ""
    params = {
        "address1": address1,
        "address2": address2
    }

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            response = await client.get(url, headers=headers, params=params)

        if response.status_code != 200:
            return {
                "error": f"ATTOM returned HTTP {response.status_code}",
                "year_built": None,
                "square_footage": None,
                "bedrooms": None,
                "bathrooms": None,
                "property_type": None
            }

        data = response.json()

        properties = data.get("property", [])
        if not properties:
            return {
                "error": "No property found in ATTOM",
                "year_built": None,
                "square_footage": None,
                "bedrooms": None,
                "bathrooms": None,
                "property_type": None
            }

        prop = properties[0]
        building = prop.get("building", {})
        summary = prop.get("summary", {})
        rooms = building.get("rooms", {})
        size = building.get("size", {})

        return {
            "year_built": summary.get("yearBuilt"),
            "square_footage_living": size.get("livingSize"),
            "square_footage_building": size.get("bldgSize"),
            "bedrooms": rooms.get("beds"),
            "bathrooms_full": rooms.get("bathsFull"),
            "bathrooms_partial": rooms.get("bathsPartial"),
            "bathrooms_total": rooms.get("bathsTotal"),
            "property_type": summary.get("propertyType"),
            "prop_class": summary.get("propClass"),
            "stories": building.get("summary", {}).get("levels"),
            "lot_size_acres": prop.get("lot", {}).get("lotSize2")
        }

    except httpx.TimeoutException:
        return {
            "error": "ATTOM timed out",
            "year_built": None,
            "square_footage": None
        }
    except Exception as e:
        return {
            "error": str(e),
            "year_built": None,
            "square_footage": None
        }


# ── 7. FBI Crime Data → property & violent crime rates ──────────────────────

async def get_crime_data(city: str, state: str):
    """
    FBI Crime Data API — free key from api.data.gov
    Returns property crime and violent crime rates per 100k population.
    """
    api_key = os.getenv("FBI_API_KEY")
    base = "https://api.usa.gov/crime/fbi/cde"

    # Step 1: Get all agencies for this state
    agencies_url = f"{base}/agency/byStateAbbr/{state.upper()}"
    params = {"API_KEY": api_key}

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            response = await client.get(agencies_url, params=params)

        if response.status_code != 200:
            return {
                "error": f"FBI agencies endpoint returned HTTP {response.status_code}",
                "property_crime_rate": None,
                "violent_crime_rate": None,
                "debug_url": agencies_url
            }

        agencies_data = response.json()
        # Debug: return raw response to see structure
        return {"debug_raw": agencies_data, "status": response.status_code}
        agencies = agencies_data.get("results", [])

        # Find the city police department
        city_lower = city.lower()
        agency_ori = None
        agency_name_found = None
        for agency in agencies:
            name = agency.get("agency_name", "").lower()
            if city_lower in name and "police" in name:
                agency_ori = agency.get("ori")
                agency_name_found = agency.get("agency_name")
                break

        if not agency_ori:
            return {
                "error": f"No police agency found for {city}, {state}",
                "property_crime_rate": None,
                "violent_crime_rate": None,
                "city": city,
                "state": state
            }

        # Step 2: Get property crime summary for this agency
        crime_url = f"{base}/summarized/agency/{agency_ori}/property-crime"
        crime_params = {
            "from": "2018",
            "to": "2022",
            "API_KEY": api_key
        }

        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            crime_response = await client.get(crime_url, params=crime_params)

        crime_data = crime_response.json()
        results = crime_data.get("results", [])

        if not results:
            return {
                "error": "No crime data found for this agency",
                "city": city,
                "state": state,
                "agency": agency_name_found
            }

        # Get most recent year with data
        latest = sorted(results, key=lambda x: x.get("data_year", 0), reverse=True)[0]

        property_crime = latest.get("property_crime", 0) or 0
        population = latest.get("population", 1) or 1
        property_crime_rate = round((property_crime / population) * 100000, 1)

        # Risk label
        if property_crime_rate < 1500:
            risk = "Low Risk"
        elif property_crime_rate < 3000:
            risk = "Moderate Risk"
        elif property_crime_rate < 5000:
            risk = "Elevated Risk"
        else:
            risk = "High Risk"

        return {
            "city": city,
            "state": state,
            "agency": agency_name_found,
            "year": latest.get("data_year"),
            "property_crime_rate_per_100k": property_crime_rate,
            "property_crimes": property_crime,
            "population": population,
            "risk_level": risk
        }

    except httpx.TimeoutException:
        return {"error": "FBI API timed out", "property_crime_rate": None}
    except Exception as e:
        return {"error": str(e), "property_crime_rate": None}


# ── 8. USGS Wildfire Risk ────────────────────────────────────────────────────

async def get_wildfire_risk(lat: float, lng: float):
    """
    USGS Wildfire Hazard Potential — free, no key needed.
    Returns wildfire risk level for the location.
    """
    # USGS National Land Cover + Wildfire Hazard Potential via ArcGIS
    url = "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_WildfireHazardPotential_01/MapServer/0/query"
    params = {
        "geometry": f"{lng},{lat}",
        "geometryType": "esriGeometryPoint",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "WHP_CLASS,WHP_CATEGORY",
        "returnGeometry": "false",
        "f": "json"
    }

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            response = await client.get(url, params=params)

        if response.status_code != 200:
            return {
                "error": f"USGS returned HTTP {response.status_code}",
                "risk_level": "Unknown"
            }

        data = response.json()
        features = data.get("features", [])

        if not features:
            # No data means very low wildfire risk (urban/developed area)
            return {
                "risk_level": "Very Low",
                "whp_class": "Non-burnable",
                "note": "No wildfire hazard data — likely urban/developed area"
            }

        attrs = features[0].get("attributes", {})
        whp_class = attrs.get("WHP_CLASS", "Unknown")
        whp_category = attrs.get("WHP_CATEGORY", "Unknown")

        # Map WHP classes to risk labels
        risk_map = {
            "1": "Very Low",
            "2": "Low",
            "3": "Moderate",
            "4": "High",
            "5": "Very High",
            "6": "Non-burnable"
        }
        risk = risk_map.get(str(whp_class), whp_category or "Unknown")

        return {
            "risk_level": risk,
            "whp_class": whp_class,
            "whp_category": whp_category
        }

    except httpx.TimeoutException:
        return {"error": "USGS wildfire API timed out", "risk_level": "Unknown"}
    except Exception as e:
        return {"error": str(e), "risk_level": "Unknown"}