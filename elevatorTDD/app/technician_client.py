import httpx


class TechnicianHttpClient:
    def __init__(self, base_url, timeout=30.0):
        self._client = httpx.Client(base_url=base_url, timeout=timeout)

    def dispatch(self, elevator_id):
        response = self._client.post("/dispatch", json={"elevator_id": elevator_id})
        response.raise_for_status()
        return response.json()

    def fix(self, elevator_id, fix_seconds):
        response = self._client.post(
            "/fix",
            json={"elevator_id": elevator_id, "fix_seconds": fix_seconds},
            timeout=fix_seconds + 30.0,
        )
        response.raise_for_status()
        return response.json()
