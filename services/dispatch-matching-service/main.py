import json
import threading
import time
import redis
import requests
from kafka import KafkaConsumer, KafkaProducer
from sqlalchemy import create_engine, text
from fastapi import FastAPI

app = FastAPI(title="Rapido - Dispatch Matching Service")

# ── config ──────────────────────────────────────────────────────────────────
KAFKA_BOOTSTRAP = "localhost:9092"
REDIS_HOST = "localhost"
REDIS_PORT = 6379
DB_URL = "postgresql://rapido:rapido_dev_pw@localhost:5432/rapido"
RIDE_MANAGEMENT_URL = "http://localhost:8001"
GEO_KEY = "drivers:locations"
SEARCH_RADIUS_KM = 5.0

# ── clients ──────────────────────────────────────────────────────────────────
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
engine = create_engine(DB_URL)

producer = KafkaProducer(
    bootstrap_servers=KAFKA_BOOTSTRAP,
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
)


# ── core matching logic ───────────────────────────────────────────────────────
def find_nearest_available_driver(pickup_lat: float, pickup_lng: float):
    """Query Redis for nearby drivers, return the closest available one."""
    results = redis_client.geosearch(
        GEO_KEY,
        longitude=pickup_lng,
        latitude=pickup_lat,
        radius=SEARCH_RADIUS_KM,
        unit="km",
        withcoord=True,
        withdist=True,
        sort="ASC",  # closest first
    )
    for item in results:
        driver_id, distance, (lng, lat) = item
        if redis_client.exists(f"driver:available:{driver_id}"):
            return driver_id, round(distance, 3)
    return None, None


def assign_driver_transactionally(ride_id: str, driver_id: str) -> bool:
    """
    Atomically assign driver to ride in Postgres.
    Only succeeds if ride is still REQUESTED and driver not already assigned.
    This is what prevents two ride requests from claiming the same driver.
    """
    with engine.begin() as conn:
        # Lock the ride row for update
        result = conn.execute(
            text("""
                SELECT id, status, driver_id
                FROM rides
                WHERE id = :ride_id
                FOR UPDATE
            """),
            {"ride_id": ride_id},
        ).fetchone()

        if not result:
            print(f"  Ride {ride_id} not found")
            return False

        if result.status != "REQUESTED":
            print(f"  Ride {ride_id} already in status {result.status}, skipping")
            return False

        if result.driver_id is not None:
            print(f"  Ride {ride_id} already has driver {result.driver_id}, skipping")
            return False

        # Assign the driver
        conn.execute(
            text("""
                UPDATE rides
                SET driver_id = :driver_id, status = 'MATCHED', updated_at = now()
                WHERE id = :ride_id
            """),
            {"driver_id": driver_id, "ride_id": ride_id},
        )

        # Mark driver as busy in Redis so they don't get matched to another ride
        redis_client.delete(f"driver:available:{driver_id}")

    return True


def process_ride_requested(event: dict):
    ride_id = event.get("ride_id")
    pickup_lat = event.get("pickup_lat")
    pickup_lng = event.get("pickup_lng")

    print(f"\n Ride requested: {ride_id}")
    print(f"  Pickup: {pickup_lat}, {pickup_lng}")

    # 1. Find nearest available driver from Redis
    driver_id, distance_km = find_nearest_available_driver(pickup_lat, pickup_lng)

    if not driver_id:
        print(f"  No available drivers near {pickup_lat}, {pickup_lng}")
        return

    print(f"  Nearest driver: {driver_id} ({distance_km} km away)")

    # 2. Transactionally assign in Postgres
    success = assign_driver_transactionally(ride_id, driver_id)

    if not success:
        print(f"  Assignment failed for ride {ride_id}")
        return

    print(f"  Driver {driver_id} assigned to ride {ride_id}")

    # 3. Publish ride.matched event
    event_out = {
        "event_type": "ride.matched",
        "ride_id": ride_id,
        "driver_id": driver_id,
        "distance_km": distance_km,
    }
    producer.send("ride.matched", value=event_out)
    producer.flush()
    print(f"  Published ride.matched event")


# ── Kafka consumer loop (runs in background thread) ───────────────────────────
def start_consumer():
    print("Starting Kafka consumer for ride.requested...")
    consumer = KafkaConsumer(
        "ride.requested",
        bootstrap_servers=KAFKA_BOOTSTRAP,
        group_id="dispatch-matching-group",
        auto_offset_reset="earliest",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )
    for message in consumer:
        try:
            process_ride_requested(message.value)
        except Exception as e:
            print(f"Error processing message: {e}")


@app.on_event("startup")
def startup():
    thread = threading.Thread(target=start_consumer, daemon=True)
    thread.start()


# ── health + status endpoints ─────────────────────────────────────────────────
@app.get("/")
def root():
    return {"service": "dispatch-matching-service", "status": "running"}


@app.get("/health")
def health():
    try:
        redis_client.ping()
        redis_ok = True
    except Exception:
        redis_ok = False

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "redis": "ok" if redis_ok else "error",
        "postgres": "ok" if db_ok else "error",
    }