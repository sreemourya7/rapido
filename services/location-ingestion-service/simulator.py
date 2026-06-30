import time
import random
import requests

# Simulate drivers around San Jose, CA
BASE_LAT = 37.3382
BASE_LNG = -121.8863
NUM_DRIVERS = 10
PING_INTERVAL_SECONDS = 2

drivers = [f"driver-{i}" for i in range(1, NUM_DRIVERS + 1)]

print(f"Simulating {NUM_DRIVERS} drivers. Press Ctrl+C to stop.")

while True:
    for driver_id in drivers:
        # Small random drift to simulate movement
        lat = BASE_LAT + random.uniform(-0.05, 0.05)
        lng = BASE_LNG + random.uniform(-0.05, 0.05)
        heading = random.uniform(0, 360)
        speed = random.uniform(0, 60)

        try:
            requests.post(
                "http://localhost:8003/drivers/location",
                json={
                    "driver_id": driver_id,
                    "lat": lat,
                    "lng": lng,
                    "heading": heading,
                    "speed": speed,
                },
                timeout=2,
            )
            print(f"  {driver_id} → lat={lat:.4f}, lng={lng:.4f}")
        except Exception as e:
            print(f"  Error for {driver_id}: {e}")

    time.sleep(PING_INTERVAL_SECONDS)