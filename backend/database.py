import sqlite3
import json
import os
from datetime import datetime

DB_PATH = "assessments.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS assessments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            address TEXT NOT NULL,
            formatted_address TEXT,
            zip_code TEXT,
            lat REAL,
            lng REAL,

            flood_zone TEXT,
            fire_station TEXT,
            weather_alerts TEXT,
            census TEXT,
            property_details TEXT,
            crime TEXT,
            wildfire TEXT,

            roof_type TEXT,
            electrical_updated TEXT,
            pipe_material TEXT,
            security_system TEXT,
            liability_features TEXT,
            dog TEXT,
            claims_history TEXT,

            risk_score INTEGER,
            risk_rating TEXT,
            score_summary TEXT,
            full_assessment TEXT
        )
    """)

    conn.commit()
    conn.close()
    print("Database initialized at", DB_PATH)


def save_assessment(data: dict) -> int:
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO assessments (
            created_at, address, formatted_address, zip_code, lat, lng,
            flood_zone, fire_station, weather_alerts,
            census, property_details, crime, wildfire,
            roof_type, electrical_updated, pipe_material, security_system,
            liability_features, dog, claims_history,
            risk_score, risk_rating, score_summary, full_assessment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        datetime.utcnow().isoformat(),
        data.get("address"),
        data.get("formatted_address"),
        data.get("zip_code"),
        data.get("lat"),
        data.get("lng"),
        json.dumps(data.get("flood_zone")),
        json.dumps(data.get("fire_station")),
        json.dumps(data.get("weather_alerts")),
        json.dumps(data.get("census")),
        json.dumps(data.get("property_details")),
        json.dumps(data.get("crime")),
        json.dumps(data.get("wildfire")),
        data.get("roof_type"),
        data.get("electrical_updated"),
        data.get("pipe_material"),
        data.get("security_system"),
        data.get("liability_features"),
        data.get("dog"),
        data.get("claims_history"),
        data.get("risk_score"),
        data.get("risk_rating"),
        data.get("score_summary"),
        json.dumps(data.get("full_assessment"))
    ))

    conn.commit()
    assessment_id = cursor.lastrowid
    conn.close()
    return assessment_id


def get_assessment(assessment_id: int) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM assessments WHERE id = ?", (assessment_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    result = dict(row)
    for field in ["flood_zone", "fire_station", "weather_alerts",
                  "census", "property_details", "crime", "wildfire", "full_assessment"]:
        if result.get(field):
            result[field] = json.loads(result[field])

    return result


def get_all_assessments() -> list:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, created_at, address, formatted_address,
               risk_score, risk_rating, zip_code
        FROM assessments
        ORDER BY created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
