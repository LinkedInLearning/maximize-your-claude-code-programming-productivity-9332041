# data

DuckDB + MotherDuck exploration of NYC yellow taxi trips (`sample_data.nyc.taxi`).

## Quickstart

```bash
uv sync
cp .env.example .env   # then paste your motherduck_token
uv run jupyter lab notebooks/taxi_analysis.ipynb
```

## Smoke test

```bash
uv run python -c "import os, duckdb; from dotenv import load_dotenv; load_dotenv(); \
con = duckdb.connect(f\"md:?motherduck_token={os.environ['motherduck_token']}\"); \
print(con.sql('SELECT COUNT(*) FROM sample_data.nyc.taxi').fetchone())"
```

## Layout

- `notebooks/taxi_analysis.ipynb` — connection + trip stats + charts
- `pyproject.toml` / `uv.lock` — dependencies
- `.env` — `motherduck_token=...` (gitignored)
