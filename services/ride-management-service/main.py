import uuid
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import engine, get_db, Base
from models import Ride
from state_machine import validate_transition, InvalidTransitionError

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Rapido - Ride Management Service")


class CreateRideRequest(BaseModel):
    rider_id: str
    pickup_lat: float
    pickup_lng: float
    dropoff_lat: float | None = None
    dropoff_lng: float | None = None


class UpdateStatusRequest(BaseModel):
    new_status: str


@app.get("/")
def root():
    return {"service": "ride-management-service", "status": "running"}


@app.post("/rides")
def create_ride(req: CreateRideRequest, db: Session = Depends(get_db)):
    ride = Ride(
        id=uuid.uuid4(),
        rider_id=req.rider_id,
        status="REQUESTED",
        pickup_lat=req.pickup_lat,
        pickup_lng=req.pickup_lng,
        dropoff_lat=req.dropoff_lat,
        dropoff_lng=req.dropoff_lng,
    )
    db.add(ride)
    db.commit()
    db.refresh(ride)
    return ride


@app.get("/rides/{ride_id}")
def get_ride(ride_id: uuid.UUID, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    return ride


@app.patch("/rides/{ride_id}/status")
def update_status(ride_id: uuid.UUID, req: UpdateStatusRequest, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    try:
        validate_transition(ride.status, req.new_status)
    except InvalidTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    ride.status = req.new_status
    db.commit()
    db.refresh(ride)
    return ride