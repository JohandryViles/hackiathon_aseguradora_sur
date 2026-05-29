from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.app.routes import agent_routes, analysis_routes


app = FastAPI(
    title="FraudIA Claims API",
    description=(
        "API de apoyo para detectar posibles señales de riesgo en siniestros. "
        "Los resultados requieren revisión humana y no constituyen acusaciones automaticas."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_routes.router)
app.include_router(agent_routes.router)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "fraudia-claims-api"}

