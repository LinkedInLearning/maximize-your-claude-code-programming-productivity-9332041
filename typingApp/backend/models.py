from pydantic import BaseModel, Field


class UserIn(BaseModel):
    name: str = Field(min_length=1, max_length=32)


class UserOut(BaseModel):
    id: int
    name: str


class PassageOut(BaseModel):
    id: int
    text: str


class ResultIn(BaseModel):
    user_id: int
    passage_id: int
    wpm: float
    accuracy: float
    duration_ms: int


class ResultOut(BaseModel):
    id: int
    user_id: int
    passage_id: int
    wpm: float
    accuracy: float
    duration_ms: int
    created_at: str


class HistoryRow(BaseModel):
    id: int
    passage_id: int
    wpm: float
    accuracy: float
    duration_ms: int
    created_at: str


class LeaderboardRow(BaseModel):
    user_name: str
    passage_id: int
    wpm: float
    accuracy: float
    created_at: str
