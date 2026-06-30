import time
import redis
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Rapido - Location Ingestion Service")

redis_client = redis.Redis(host="localhost", port=6379, decode_responses=True)

GEO_KEY = "drivers:locations"
DRIVER_TTL_SECONDS = 30  # driver expires from pool if silent for 30s


class LocationUpdate(BaseModel):
    driver_id: str
    lat: float
    lng: float
    heading: float | None = None
    speed: float | None = None


@app.get("/")
def root():
    return {"service": "location-ingestion-service", "status": "running"}


@app.post("/drivers/location")
def update_location(update: LocationUpdate):
    # Basic validation — reject obviously impossible coordinates
    if not (-90 <= update.lat <= 90):
        raise HTTPException(status_code=400, detail="Invalid latitude")
    if not (-180 <= update.lng <= 180):
        raise HTTPException(status_code=400, detail="Invalid longitude")

    # Write to Redis geo-index (lng comes first — Redis convention)
    redis_client.geoadd(GEO_KEY, [update.lng, update.lat, update.driver_id])

    # Set a TTL on the driver's availability key
    # If the driver goes silent, they automatically fall out of the available pool
    availability_key = f"driver:available:{update.driver_id}"
    redis_client.set(availability_key, "1", ex=DRIVER_TTL_SECONDS)

    # Optionally store heading/speed as metadata
    if update.heading is not None or update.speed is not None:
        meta_key = f"driver:meta:{update.driver_id}"
        redis_client.hset(meta_key, mapping={
            "heading": update.heading or 0,
            "speed": update.speed or 0,
            "last_seen": int(time.time()),
        })
        redis_client.expire(meta_key, DRIVER_TTL_SECONDS)

    return {"status": "ok", "driver_id": update.driver_id}


@app.get("/drivers/nearby")
def get_nearby_drivers(lat: float, lng: float, radius_km: float = 5.0):
    # Query Redis for drivers within radius_km of the given point
    results = redis_client.geosearch(
        GEO_KEY,
        longitude=lng,
        latitude=lat,
        radius=radius_km,
        unit="km",
        withcoord=True,
        withdist=True,
        sort="ASC",
    )

    # Filter to only drivers still marked as available (TTL key still alive)
    available = []
    for item in results:
        driver_id, distance, (res_lng, res_lat) = item
        if redis_client.exists(f"driver:available:{driver_id}"):
            available.append({
                "driver_id": driver_id,
                "distance_km": round(distance, 3),
                "lat": res_lat,
                "lng": res_lng,
            })

    return {"nearby_drivers": available, "count": len(available)}