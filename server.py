from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router as api_router

app = FastAPI(title="Mikrometoxos Engine API")

# STRICT CORS CONFIGURATION
origins = [
    "http://localhost:5173",      # Your local React dev server
    "http://127.0.0.1:5173",      # Alternate local IP
    # "https://your-future-domain.vercel.app" <-- Add your cloud domain here later
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # Only allow these domains
    allow_credentials=True,
    allow_methods=["GET"],        # Only allow GET requests (since we have no POST forms)
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")