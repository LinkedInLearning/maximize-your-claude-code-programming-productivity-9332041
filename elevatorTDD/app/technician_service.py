import time

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


class DispatchRequest(BaseModel):
    elevator_id: str


class FixRequest(BaseModel):
    elevator_id: str
    fix_seconds: float


def build_app(technician_ids, travel_seconds):
    app = FastAPI()
    busy_until = {tid: 0.0 for tid in technician_ids}
    assignments = {}

    @app.post("/dispatch")
    def dispatch(req: DispatchRequest):
        if req.elevator_id in assignments:
            raise HTTPException(409, f"elevator {req.elevator_id} already dispatched")
        now = time.monotonic()
        technician_id = min(busy_until, key=lambda t: busy_until[t])
        wait = max(0.0, busy_until[technician_id] - now)
        eta = wait + travel_seconds
        busy_until[technician_id] = now + eta
        assignments[req.elevator_id] = {
            "technician_id": technician_id,
            "onsite_at": now + eta,
        }
        return {
            "elevator_id": req.elevator_id,
            "technician_id": technician_id,
            "eta_seconds": eta,
        }

    @app.get("/technicians/{technician_id}/status")
    def status(technician_id: str):
        if technician_id not in busy_until:
            raise HTTPException(404, f"unknown technician {technician_id}")
        now = time.monotonic()
        for elevator_id, assignment in assignments.items():
            if assignment["technician_id"] != technician_id:
                continue
            remaining = max(0.0, assignment["onsite_at"] - now)
            return {
                "technician_id": technician_id,
                "elevator_id": elevator_id,
                "state": "en_route" if remaining > 0 else "onsite",
                "eta_seconds": remaining,
            }
        return {
            "technician_id": technician_id,
            "elevator_id": None,
            "state": "idle",
            "eta_seconds": 0.0,
        }

    @app.post("/fix")
    def fix(req: FixRequest):
        if req.fix_seconds < 0:
            raise HTTPException(400, "fix_seconds must be non-negative")
        assignment = assignments.get(req.elevator_id)
        if assignment is None:
            raise HTTPException(404, f"no dispatch for elevator {req.elevator_id}")
        if time.monotonic() < assignment["onsite_at"]:
            raise HTTPException(409, "technician not yet onsite")
        time.sleep(req.fix_seconds)
        technician_id = assignment["technician_id"]
        del assignments[req.elevator_id]
        return {"fixed": True, "technician_id": technician_id, "elapsed": req.fix_seconds}

    return app


app = build_app(technician_ids=["t1", "t2"], travel_seconds=5.0)
