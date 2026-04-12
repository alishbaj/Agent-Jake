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

            -- Location
            address TEXT NOT NULL,
            formatted_address TEXT,
            zip_code TEXT,
            lat REAL,
            lng REAL,

            -- API enrichment (stored as JSON strings)
            flood_zone TEXT,
            fire_station TEXT,
            weather_alerts TEXT,
            census TEXT,
            property_details TEXT,
            crime TEXT,
            wildfire TEXT,

            -- Jake intake fields (new)
            year_built INTEGER,
            construction_type TEXT,
            roof_type TEXT,
            roof_age_range TEXT,
            square_footage_range TEXT,
            has_security_system TEXT,
            smoke_detectors TEXT,
            has_water_sensors TEXT,
            has_fire_extinguisher TEXT,
            flood_storm_mitigation TEXT,
            prior_claims_count TEXT,
            prior_claims_type TEXT,
            credit_tier TEXT,
            email TEXT,

            -- Scoring output
            risk_score INTEGER,
            risk_tier TEXT,
            score_drivers TEXT,
            gemini_summary TEXT,
            gemini_recommendations TEXT,
            full_assessment TEXT
        )
    """)

    conn.commit()
    conn.close()
    print("Database initialized at", DB_PATH)


def migrate_db():
    """
    Run this once to add new columns to an existing database
    without dropping the table. Safe to call multiple times.
    """
    conn = get_db()
    cursor = conn.cursor()

    new_columns = [
        ("year_built", "INTEGER"),
        ("construction_type", "TEXT"),
        ("roof_age_range", "TEXT"),
        ("square_footage_range", "TEXT"),
        ("has_security_system", "TEXT"),
        ("smoke_detectors", "TEXT"),
        ("has_water_sensors", "TEXT"),
        ("has_fire_extinguisher", "TEXT"),
        ("flood_storm_mitigation", "TEXT"),
        ("prior_claims_count", "TEXT"),
        ("prior_claims_type", "TEXT"),
        ("credit_tier", "TEXT"),
        ("email", "TEXT"),
        ("risk_tier", "TEXT"),
        ("score_drivers", "TEXT"),
        ("gemini_summary", "TEXT"),
        ("gemini_recommendations", "TEXT"),
    ]

    existing = [row[1] for row in cursor.execute("PRAGMA table_info(assessments)")]

    for col_name, col_type in new_columns:
        if col_name not in existing:
            cursor.execute(f"ALTER TABLE assessments ADD COLUMN {col_name} {col_type}")
            print(f"Added column: {col_name}")

    conn.commit()
    conn.close()


def save_assessment(data: dict) -> int:
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO assessments (
            created_at, address, formatted_address, zip_code, lat, lng,
            flood_zone, fire_station, weather_alerts,
            census, property_details, crime, wildfire,
            year_built, construction_type, roof_type, roof_age_range,
            square_footage_range, has_security_system, smoke_detectors,
            has_water_sensors, has_fire_extinguisher, flood_storm_mitigation,
            prior_claims_count, prior_claims_type, credit_tier, email,
            risk_score, risk_tier, score_drivers,
            gemini_summary, gemini_recommendations, full_assessment
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?
        )
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
        data.get("year_built"),
        data.get("construction_type"),
        data.get("roof_type"),
        data.get("roof_age_range"),
        data.get("square_footage_range"),
        data.get("has_security_system"),
        data.get("smoke_detectors"),
        data.get("has_water_sensors"),
        data.get("has_fire_extinguisher"),
        data.get("flood_storm_mitigation"),
        data.get("prior_claims_count"),
        data.get("prior_claims_type"),
        data.get("credit_tier"),
        data.get("email"),
        data.get("risk_score"),
        data.get("risk_tier"),
        json.dumps(data.get("score_drivers")),
        data.get("gemini_summary"),
        json.dumps(data.get("gemini_recommendations")),
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
                  "census", "property_details", "crime", "wildfire",
                  "score_drivers", "gemini_recommendations", "full_assessment"]:
        if result.get(field):
            try:
                result[field] = json.loads(result[field])
            except Exception:
                pass

    return result


def get_all_assessments() -> list:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, created_at, address, formatted_address,
               risk_score, risk_tier, zip_code, email
        FROM assessments
        ORDER BY created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_assessments_by_email(email: str) -> list:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, created_at, address, formatted_address,
               risk_score, risk_tier, zip_code
        FROM assessments
        WHERE email = ?
        ORDER BY created_at DESC
    """, (email,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]