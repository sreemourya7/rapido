from fastapi import FastAPI
import psycopg2

app = FastAPI(title="Rapido - Ride Management Service")

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "rapido",
    "user": "rapido",
    "password": "rapido_dev_pw",
}

@app.get("/")
def root():
    return {"service": "ride-management-service", "status": "running"}

@app.get("/health/db")
def health_db():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("SELECT postgis_version();")
        version = cur.fetchone()[0]
        cur.close()
        conn.close()
        return {"db_connected": True, "postgis_version": version}
    except Exception as e:
        return {"db_connected": False, "error": str(e)}