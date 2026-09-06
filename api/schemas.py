"""
api/schemas.py
Pydantic data models for request validation and response serialization.
"""

from pydantic import BaseModel
from typing import List, Dict, Any

class IndicatorResult(BaseModel):
    ticker: str
    price: float
    trend: str
    rsi: float
    stoch: float
    macd: str
    bollinger: str
    atr: str
    roc: str
    score: str
    master_signal: str
    history: List[Dict[str, Any]] = []  # New field for the chart

class ScreenerResponse(BaseModel):
    count: int
    data: List[IndicatorResult]