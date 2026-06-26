import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
from kafka import KafkaProducer

app = FastAPI(title="Rapido - Ride Request Service")

RIDE_MANAGEMENT_URL = "http://localhost:8001"
KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"

producer = KafkaProducer(
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
)


class RideRequest(BaseModel):
    rider_id: str
    pickup_lat: float
    pickup_lng: float
    dropoff_lat: float | None = None
    dropoff_lng: float | None = None


@app.get("/")
def root():
    return {"service": "ride-request-service", "status": "running"}


@app.post("/ride-requests")
def create_ride_request(req: RideRequest):
    # 1. Validate (placeholder for now — real checks come later)
    if not req.rider_id:
        raise HTTPException(status_code=400, detail="rider_id is required")

    # 2. Call Ride Management to create the actual ride record
    response = requests.post(f"{RIDE_MANAGEMENT_URL}/rides", json=req.model_dump())
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to create ride in ride-management-service")

    ride = response.json()

    # 3. Publish ride.requested event to Kafka
    event = {
        "event_type": "ride.requested",
        "ride_id": ride["id"],
        "rider_id": ride["rider_id"],
        "pickup_lat": ride["pickup_lat"],
        "pickup_lng": ride["pickup_lng"],
    }
    producer.send("ride.requested", value=event)
    producer.flush()

    return {"ride": ride, "event_published": event}