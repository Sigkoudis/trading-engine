"""
server.py
FastAPI application entrypoint and middleware configuration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router as api_router

app = FastAPI(
    title="Quantitative Trading Engine API",
    description="REST API exposing quantitative screening and portfolio optimization metrics.",
    version="1.0.0"
)

# Enable CORS so our future frontend running on localhost (e.g., port 3000 or 5173) can talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the router under /api/v1
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def health_check():
    return {"status": "online", "service": "Quant Engine API"}