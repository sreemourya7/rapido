from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from jose import jwt
from passlib.context import CryptContext

app = FastAPI(title="Rapido - Auth Service")

# In production this would be a long random secret stored in a secrets manager
SECRET_KEY = "rapido-dev-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hardcoded users for now — in production this would be a real user DB
FAKE_USERS = {
    "rider-1": {
        "user_id": "rider-1",
        "role": "rider",
        "hashed_password": pwd_context.hash("password123"),
    },
    "driver-1": {
        "user_id": "driver-1",
        "role": "driver",
        "hashed_password": pwd_context.hash("password123"),
    },
}


class LoginRequest(BaseModel):
    user_id: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str


def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


@app.get("/")
def root():
    return {"service": "auth-service", "status": "running"}


@app.post("/auth/login", response_model=TokenResponse)
def login(req: LoginRequest):
    user = FAKE_USERS.get(req.user_id)
    if not user or not pwd_context.verify(req.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    token = create_access_token(user["user_id"], user["role"])
    return {"access_token": token, "token_type": "bearer", "role": user["role"]}


@app.post("/auth/verify")
def verify(token: str):
    payload = verify_token(token)
    return {"valid": True, "user_id": payload["sub"], "role": payload["role"]}