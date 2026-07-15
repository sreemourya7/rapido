import json
import threading
import time
import redis
from kafka import KafkaConsumer, KafkaProducer
from sqlalchemy import create_engine, text
from fastapi import FastAPI

app = FastAPI(title="Rapido - Dispatch Matching Service")

# ── config ────────────────────────────────────────────────────────────────────
KAFKA_BOOTSTRAP = "localhost:9092"
REDIS_HOST = "localhost"
REDIS_PORT = 6379
DB_URL = "postgresql://rapido:rapido_dev_pw@localhost:5432/rapido"
GEO_KEY = "drivers:locations"
SEARCH_RADIUS_KM = 5.0
OFFER_TIMEOUT_SECONDS = 15

# ── clients ───────────────────────────────────────────────────────────────────
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
engine = create_engine(DB_URL)

producer = KafkaProducer(
    bootstrap_servers=KAFKA_BOOTSTRAP,
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
)


# ── helpers ───────────────────────────────────────────────────────────────────
def get_ranked_drivers(pickup_lat: float, pickup_lng: float):
    """
    Query Redis for nearby drivers sorted by distance (ASC).
    Returns a ranked list of available drivers.
    """
    results = redis_client.geosearch(
        GEO_KEY,
        longitude=pickup_lng,
        latitude=pickup_lat,
        radius=SEARCH_RADIUS_KM,
        unit="km",
        withcoord=True,
        withdist=True,
        sort="ASC",
    )
    ranked = []
    for item in results:
        driver_id, distance, (lng, lat) = item
        if redis_client.exists(f"driver:available:{driver_id}"):
            ranked.append({
                "driver_id": driver_id,
                "distance_km": round(distance, 3),
            })
    return ranked


def send_offer(ride_id: str, driver_id: str, distance_km: float):
    """
    Publish ride.offered_to_driver event and store
    pending offer in Redis with TTL = OFFER_TIMEOUT_SECONDS.
    """
    # Store pending offer in Redis — key expires automatically after timeout
    offer_key = f"offer:{ride_id}"
    redis_client.set(offer_key, driver_id, ex=OFFER_TIMEOUT_SECONDS)

    # Publish offer event to Kafka
    producer.send("ride.offered_to_driver", value={
        "event_type": "ride.offered_to_driver",
        "ride_id": ride_id,
        "driver_id": driver_id,
        "distance_km": distance_km,
        "timeout_seconds": OFFER_TIMEOUT_SECONDS,
    })
    producer.flush()
    print(f"  Offer sent to {driver_id} for ride {ride_id} "
          f"(timeout: {OFFER_TIMEOUT_SECONDS}s)")


def update_ride_status(ride_id: str, new_status: str, driver_id: str = None):
    """Update ride status in Postgres."""
    with engine.begin() as conn:
        if driver_id:
            conn.execute(
                text("""
                    UPDATE rides
                    SET status = :status,
                        driver_id = :driver_id,
                        updated_at = now()
                    WHERE id = :ride_id
                """),
                {"status": new_status,
                 "driver_id": driver_id,
                 "ride_id": ride_id},
            )
        else:
            conn.execute(
                text("""
                    UPDATE rides
                    SET status = :status,
                        updated_at = now()
                    WHERE id = :ride_id
                """),
                {"status": new_status, "ride_id": ride_id},
            )


def mark_driver_busy(driver_id: str):
    """Remove driver from available pool in Redis."""
    redis_client.delete(f"driver:available:{driver_id}")


def run_offer_loop(ride_id: str, pickup_lat: float, pickup_lng: float):
    """
    Core offer-accept loop.
    Iterates through ranked drivers one by one until:
    - A driver accepts → ride.matched
    - All drivers reject/timeout → ride.no_drivers_available
    """
    candidates = get_ranked_drivers(pickup_lat, pickup_lng)

    if not candidates:
        print(f"  No drivers found near {pickup_lat}, {pickup_lng}")
        update_ride_status(ride_id, "NO_DRIVERS")
        producer.send("ride.no_drivers_available", value={
            "event_type": "ride.no_drivers_available",
            "ride_id": ride_id,
        })
        producer.flush()
        return

    print(f"  Found {len(candidates)} candidate drivers: "
          f"{[c['driver_id'] for c in candidates]}")

    # Update ride to OFFERED in Postgres
    update_ride_status(ride_id, "OFFERED")

    for candidate in candidates:
        driver_id = candidate["driver_id"]
        distance_km = candidate["distance_km"]

        print(f"\n  Offering ride {ride_id} to {driver_id} "
              f"({distance_km} km away)...")

        # Send offer — stores in Redis with TTL
        send_offer(ride_id, driver_id, distance_km)

        # Poll for driver response (check Redis every 0.5s for up to timeout)
        offer_key = f"offer:{ride_id}"
        response_key = f"response:{ride_id}:{driver_id}"
        accepted = False
        elapsed = 0

        while elapsed < OFFER_TIMEOUT_SECONDS:
            time.sleep(0.5)
            elapsed += 0.5

            # Check if driver responded
            response = redis_client.get(response_key)

            if response == "accepted":
                accepted = True
                redis_client.delete(response_key)
                redis_client.delete(offer_key)
                break

            elif response == "rejected":
                redis_client.delete(response_key)
                redis_client.delete(offer_key)
                print(f"  {driver_id} rejected the offer.")
                break

            # Check if offer TTL expired (timeout)
            if not redis_client.exists(offer_key):
                print(f"  {driver_id} timed out (no response in "
                      f"{OFFER_TIMEOUT_SECONDS}s).")
                break

        if accepted:
            # Assign driver transactionally
            mark_driver_busy(driver_id)
            update_ride_status(ride_id, "MATCHED", driver_id)

            producer.send("ride.matched", value={
                "event_type": "ride.matched",
                "ride_id": ride_id,
                "driver_id": driver_id,
                "distance_km": distance_km,
            })
            producer.flush()
            print(f"  ✓ Driver {driver_id} accepted! "
                  f"Ride {ride_id} is MATCHED.")
            return  # Done — exit loop

        # Driver rejected/timed out — try next candidate
        print(f"  Trying next driver...")

    # All candidates exhausted
    print(f"  All drivers rejected. Ride {ride_id} has NO_DRIVERS.")
    update_ride_status(ride_id, "NO_DRIVERS")
    producer.send("ride.no_drivers_available", value={
        "event_type": "ride.no_drivers_available",
        "ride_id": ride_id,
        "reason": "all_drivers_rejected_or_timed_out",
    })
    producer.flush()


# ── Kafka consumer ────────────────────────────────────────────────────────────
def start_consumer():
    print("Starting Kafka consumer for ride.requested...")
    consumer = KafkaConsumer(
        "ride.requested",
        bootstrap_servers=KAFKA_BOOTSTRAP,
        group_id="dispatch-matching-group",
        auto_offset_reset="latest",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )
    for message in consumer:
        event = message.value
        ride_id = event.get("ride_id")
        pickup_lat = event.get("pickup_lat")
        pickup_lng = event.get("pickup_lng")

        print(f"\n Ride requested: {ride_id}")
        print(f"  Pickup: {pickup_lat}, {pickup_lng}")

        # Run offer loop in a separate thread so consumer
        # doesn't block on waiting for driver responses
        thread = threading.Thread(
            target=run_offer_loop,
            args=(ride_id, pickup_lat, pickup_lng),
            daemon=True,
        )
        thread.start()


@app.on_event("startup")
def startup():
    thread = threading.Thread(target=start_consumer, daemon=True)
    thread.start()


# ── health ────────────────────────────────────────────────────────────────────
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