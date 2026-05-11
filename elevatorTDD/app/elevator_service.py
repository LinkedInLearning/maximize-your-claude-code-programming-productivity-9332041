import os
import random
import time
from dataclasses import dataclass
from typing import Optional

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.elevator import Elevator
from app.technician_client import TechnicianHttpClient


class CallRequest(BaseModel):
    floor: int
    user: Optional[str] = None


@dataclass
class _Repair:
    technician_id: str
    onsite_at: float


def build_app(*, elevator_id, top_speed, rng, technician_client, fix_seconds):
    app = FastAPI()
    elevator = Elevator(top_speed=top_speed)
    repair: dict = {"state": None}

    def _fixing_response(r: _Repair):
        return JSONResponse(
            status_code=503,
            content={
                "error": "fixing",
                "eta_seconds": max(0.0, r.onsite_at - time.monotonic()),
                "technician_id": r.technician_id,
            },
        )

    @app.post("/call_to")
    def call_to(req: CallRequest):
        r = repair["state"]
        if r is not None:
            if time.monotonic() >= r.onsite_at:
                technician_client.fix(elevator_id, fix_seconds)
                repair["state"] = None
            else:
                return _fixing_response(r)
        if rng.random() < 0.01:
            info = technician_client.dispatch(elevator_id)
            new_r = _Repair(
                technician_id=info["technician_id"],
                onsite_at=time.monotonic() + info["eta_seconds"],
            )
            repair["state"] = new_r
            return _fixing_response(new_r)
        elevator.call_to(req.floor, user=req.user)
        return {"current_floor": elevator.current_floor}

    return app


app = build_app(
    elevator_id=os.environ.get("ELEVATOR_ID", "e1"),
    top_speed=float(os.environ.get("TOP_SPEED", "5")),
    rng=random.Random(),
    technician_client=TechnicianHttpClient(
        base_url=os.environ.get("TECHNICIAN_URL", "http://localhost:8002")
    ),
    fix_seconds=float(os.environ.get("FIX_SECONDS", "2.0")),
)
