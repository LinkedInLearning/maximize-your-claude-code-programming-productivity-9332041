import logging
import os
import random
import threading
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("elevator_service")
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from app.elevator import Elevator
from app.technician_client import TechnicianHttpClient

_STATIC_DIR = Path(__file__).parent / "static"


class CallRequest(BaseModel):
    floor: int
    user: Optional[str] = None


@dataclass
class _Repair:
    technician_id: str
    onsite_at: float


@dataclass
class _Trip:
    from_floor: int
    to_floor: int
    started_at: float
    duration: float
    user: Optional[str]


def build_app(*, elevator_ids, top_speed, rng, technician_client, fix_seconds):
    app = FastAPI()
    elevators = {eid: Elevator(top_speed=top_speed) for eid in elevator_ids}
    repairs = {eid: None for eid in elevator_ids}
    trips = {eid: None for eid in elevator_ids}
    active_users = set()

    def _require(eid):
        if eid not in elevators:
            raise HTTPException(404, f"unknown elevator {eid}")

    def _fixing_response(r: _Repair):
        return JSONResponse(
            status_code=503,
            content={
                "error": "fixing",
                "eta_seconds": max(0.0, r.onsite_at - time.monotonic()),
                "technician_id": r.technician_id,
            },
        )

    def _live_floor(eid):
        t = trips[eid]
        if t is None or t.duration == 0:
            return float(elevators[eid].current_floor)
        elapsed = time.monotonic() - t.started_at
        if elapsed >= t.duration:
            return float(t.to_floor)
        sign = 1 if t.to_floor > t.from_floor else -1
        return t.from_floor + sign * elapsed * top_speed

    def _status_for(eid):
        r = repairs[eid]
        t = trips[eid]
        return {
            "elevator_id": eid,
            "current_floor": _live_floor(eid),
            "in_motion": t is not None,
            "is_broken": r is not None,
            "eta_seconds": max(0.0, r.onsite_at - time.monotonic()) if r else 0.0,
            "technician_id": r.technician_id if r else None,
        }

    def _start_repair(elevator_id):
        info = technician_client.dispatch(elevator_id)
        new_r = _Repair(
            technician_id=info["technician_id"],
            onsite_at=time.monotonic() + info["eta_seconds"],
        )
        repairs[elevator_id] = new_r
        return new_r

    def _run_trip(elevator_id, trip, needs_fix):
        try:
            if needs_fix:
                logger.info("trip %s: awaiting fix before travel", elevator_id)
                technician_client.fix(elevator_id, fix_seconds)
                repairs[elevator_id] = None
            logger.info(
                "trip %s: starting travel from=%s to=%s declared_duration=%.3fs",
                elevator_id, trip.from_floor, trip.to_floor, trip.duration,
            )
            t0 = time.monotonic()
            elevators[elevator_id].call_to(trip.to_floor, user=None)
            logger.info(
                "trip %s: travel returned after %.3fs (declared %.3fs)",
                elevator_id, time.monotonic() - t0, trip.duration,
            )
        finally:
            trips[elevator_id] = None
            if trip.user is not None:
                active_users.discard(trip.user)

    @app.get("/")
    def index():
        return FileResponse(_STATIC_DIR / "index.html")

    @app.get("/elevators")
    def list_elevators():
        return [_status_for(eid) for eid in elevators]

    @app.get("/elevators/{elevator_id}/status")
    def status(elevator_id: str):
        _require(elevator_id)
        return _status_for(elevator_id)

    @app.post("/elevators/{elevator_id}/maintenance")
    def maintenance(elevator_id: str):
        _require(elevator_id)
        if repairs[elevator_id] is not None:
            raise HTTPException(409, f"elevator {elevator_id} already under repair")
        r = _start_repair(elevator_id)
        return {"technician_id": r.technician_id, "eta_seconds": r.onsite_at - time.monotonic()}

    @app.post("/elevators/{elevator_id}/call_to")
    def call_to(elevator_id: str, req: CallRequest):
        _require(elevator_id)
        r = repairs[elevator_id]
        needs_fix = False
        if r is not None:
            if time.monotonic() >= r.onsite_at:
                needs_fix = True
            else:
                return _fixing_response(r)
        if trips[elevator_id] is not None:
            return JSONResponse(
                status_code=409,
                content={"error": f"elevator {elevator_id} is in motion"},
            )
        if not needs_fix and rng.random() < 0.01:
            return _fixing_response(_start_repair(elevator_id))
        if req.user is not None and req.user in active_users:
            return JSONResponse(
                status_code=409,
                content={"error": f"User {req.user!r} already has an active elevator request"},
            )
        from_floor = elevators[elevator_id].current_floor
        distance = abs(req.floor - from_floor)
        duration = distance / top_speed if top_speed and distance else 0.0
        trip = _Trip(
            from_floor=from_floor,
            to_floor=req.floor,
            started_at=time.monotonic() + (fix_seconds if needs_fix else 0.0),
            duration=duration,
            user=req.user,
        )
        trips[elevator_id] = trip
        if req.user is not None:
            active_users.add(req.user)
        logger.info(
            "call_to %s: from=%s to=%s distance=%s duration=%.3fs user=%s needs_fix=%s",
            elevator_id, from_floor, req.floor, distance, duration, req.user, needs_fix,
        )
        threading.Thread(target=_run_trip, args=(elevator_id, trip, needs_fix), daemon=True).start()
        return {
            "from_floor": from_floor,
            "to_floor": req.floor,
            "eta_seconds": duration + (fix_seconds if needs_fix else 0.0),
        }

    return app


_default_ids = [
    eid.strip()
    for eid in os.environ.get("ELEVATOR_IDS", "e1,e2").split(",")
    if eid.strip()
]

app = build_app(
    elevator_ids=_default_ids,
    top_speed=float(os.environ.get("TOP_SPEED", "1")),
    rng=random.Random(),
    technician_client=TechnicianHttpClient(
        base_url=os.environ.get("TECHNICIAN_URL", "http://localhost:8002")
    ),
    fix_seconds=float(os.environ.get("FIX_SECONDS", "2.0")),
)
