import httpx
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Rapido - API Gateway")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "rapido-dev-secret-key-change-in-production"
ALGORITHM = "HS256"

security = HTTPBearer()

SERVICES = {
    "auth":      "http://localhost:8005",
    "rides":     "http://localhost:8001",
    "requests":  "http://localhost:8002",
    "locations": "http://localhost:8003",
    "dispatch":  "http://localhost:8004",
}


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(
            credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


# ── Pydantic models ───────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    user_id: str
    password: str


class RideRequestBody(BaseModel):
    pickup_lat: float
    pickup_lng: float
    dropoff_lat: float | None = None
    dropoff_lng: float | None = None


class LocationUpdateBody(BaseModel):
    lat: float
    lng: float
    heading: float | None = None
    speed: float | None = None


# ── Public routes ─────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"service": "api-gateway", "status": "running", "version": "1.0"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/login")
async def proxy_login(req: LoginRequest):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SERVICES['auth']}/auth/login",
            json=req.model_dump()
        )
    return resp.json()


# ── Protected ride routes ─────────────────────────────────────────────────────
@app.post("/rides/request")
async def proxy_ride_request(req: RideRequestBody, token=Depends(verify_token)):
    body = req.model_dump()
    body["rider_id"] = token["sub"]  # inject from token, client can't spoof this
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{SERVICES['requests']}/ride-requests", json=body)
    return resp.json()


@app.get("/rides/{ride_id}")
async def proxy_get_ride(ride_id: str, token=Depends(verify_token)):
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{SERVICES['rides']}/rides/{ride_id}")
    return resp.json()


# ── Protected location routes ─────────────────────────────────────────────────
@app.post("/drivers/location")
async def proxy_location_update(req: LocationUpdateBody, token=Depends(verify_token)):
    body = req.model_dump()
    body["driver_id"] = token["sub"]  # driver can't spoof another driver's location
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{SERVICES['locations']}/drivers/location", json=body)
    return resp.json()


@app.get("/drivers/nearby")
async def proxy_nearby_drivers(
    lat: float, lng: float, radius_km: float = 5.0, token=Depends(verify_token)
):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{SERVICES['locations']}/drivers/nearby",
            params={"lat": lat, "lng": lng, "radius_km": radius_km},
        )
    return resp.json()