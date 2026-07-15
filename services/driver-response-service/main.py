import json
import random
import threading
import time
import redis
from kafka import KafkaConsumer
from fastapi import FastAPI

app = FastAPI(title="Rapido - Mock Driver Response Service")

KAFKA_BOOTSTRAP = "localhost:9092"
REDIS_HOST = "localhost"
REDIS_PORT = 6379

# Tune these to control simulation behavior
ACCEPT_PROBABILITY = 0.4      # 40% chance driver accepts
MIN_RESPONSE_TIME = 2         # minimum seconds before responding
MAX_RESPONSE_TIME = 12        # maximum seconds before responding
                              # (within the 15s timeout window)

redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)


def simulate_driver_response(ride_id: str, driver_id: str):
    """
    Simulates a real driver:
    1. Waits a random time (driver is looking at their phone)
    2. Randomly accepts or rejects
    3. Writes response to Redis so dispatch service sees it
    """
    # Simulate driver reaction time
    reaction_time = random.uniform(MIN_RESPONSE_TIME, MAX_RESPONSE_TIME)
    print(f"  [{driver_id}] Thinking for {reaction_time:.1f}s...")
    time.sleep(reaction_time)

    # Check if offer is still active (might have timed out while driver was thinking)
    offer_key = f"offer:{ride_id}"
    if not redis_client.exists(offer_key):
        print(f"  [{driver_id}] Offer already expired for ride {ride_id} — no response sent")
        return

    # Randomly accept or reject
    decision = "accepted" if random.random() < ACCEPT_PROBABILITY else "rejected"

    # Write response to Redis — dispatch service is polling for this key
    response_key = f"response:{ride_id}:{driver_id}"
    redis_client.set(response_key, decision, ex=30)  # 30s TTL as safety cleanup

    print(f"  [{driver_id}] → {decision.upper()} ride {ride_id}")


def start_consumer():
    print("Mock Driver Response Service listening for ride.offered_to_driver...")
    consumer = KafkaConsumer(
        "ride.offered_to_driver",
        bootstrap_servers=KAFKA_BOOTSTRAP,
        group_id="mock-driver-response-group",
        auto_offset_reset="latest",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )
    for message in consumer:
        event = message.value
        ride_id = event.get("ride_id")
        driver_id = event.get("driver_id")

        print(f"\n Offer received for ride {ride_id} → {driver_id}")

        # Respond in a separate thread so consumer keeps running
        thread = threading.Thread(
            target=simulate_driver_response,
            args=(ride_id, driver_id),
            daemon=True,
        )
        thread.start()


@app.on_event("startup")
def startup():
    thread = threading.Thread(target=start_consumer, daemon=True)
    thread.start()


@app.get("/")
def root():
    return {
        "service": "mock-driver-response-service",
        "status": "running",
        "accept_probability": ACCEPT_PROBABILITY,
        "response_time_range": f"{MIN_RESPONSE_TIME}–{MAX_RESPONSE_TIME}s",
    }