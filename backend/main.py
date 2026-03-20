import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import APP_TITLE, APP_VERSION, ALLOWED_ORIGINS
from database import engine
from models import Base
from routes import workflows, steps, rules, executions

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    description="Workflow automation engine with dynamic rule evaluation",
)

# In development: allow all origins so any localhost port works
# In production: use specific allowed origins from config
IS_PRODUCTION = os.getenv("DATABASE_URL", "").startswith("postgresql")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if IS_PRODUCTION else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workflows.router)
app.include_router(steps.router)
app.include_router(rules.router)
app.include_router(executions.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": APP_VERSION}
