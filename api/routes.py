"""
api/routes.py
REST API endpoints for the quantitative trading engine.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List
import pandas as pd

from api.schemas import ScreenerResponse, IndicatorResult
from technical.indicators import TechnicalScreener
from core.data_pipeline import MarketDataPipeline

router = APIRouter()

def sanitize_downloaded_data(df: pd.DataFrame, min_days: int = 200, min_assets: int = 1) -> pd.DataFrame:
    """Validates and cleans fetched market data."""
    if df is None or df.empty:
        return None
    cleaned = df.dropna(how="all")
    if len(cleaned) < min_days or cleaned.shape[1] < min_assets:
        return None
    return cleaned

@router.get("/screen", response_model=ScreenerResponse)
async def screen_stocks(
    tickers: str = Query(..., description="Comma-separated ticker symbols"),
    base_currency: str = Query("USD", description="Portfolio base currency"),
    days: int = Query(30, description="Days of history for the chart")
):
    clean_tickers = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not clean_tickers:
        raise HTTPException(status_code=400, detail="No valid tickers provided.")

    try:
        pipeline = MarketDataPipeline(tickers=clean_tickers, base_currency=base_currency, lookback_years=5)
        
        # Pass the 'days' variable to dynamically trigger 1m, 1h, or 1d fetching
        raw_df = pipeline.load_clean_data(target_days=days, force_refresh=True)
        
        df = sanitize_downloaded_data(raw_df, min_days=50, min_assets=1)
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="No sufficient historical data found.")

        results: List[IndicatorResult] = []
        for ticker in df.columns:
            s = df[ticker].dropna()
            res = TechnicalScreener.generate_signals(s)
            
            # Send universal Unix timestamps (milliseconds) for intraday data
            if days == 1:
                last_day = s.index[-1].date()
                recent_data = s[s.index.date == last_day]
                chart_history = [{"date": int(pd.Timestamp(idx).timestamp() * 1000), "price": round(val, 2)} for idx, val in recent_data.items()]
            
            elif days == 7:
                cutoff = s.index[-1] - pd.Timedelta(days=7)
                recent_data = s.loc[cutoff:]
                chart_history = [{"date": int(pd.Timestamp(idx).timestamp() * 1000), "price": round(val, 2)} for idx, val in recent_data.items()]
            
            else:
                # Keep daily/yearly data as simple strings (avoids weekend empty gaps)
                recent_data = s.tail(days)
                chart_history = [{"date": idx.strftime("%Y-%m-%d"), "price": round(val, 2)} for idx, val in recent_data.items()]

            results.append(IndicatorResult(
                ticker=ticker,
                price=res["Price"],
                trend=res["Trend"],
                rsi=res["RSI"],
                stoch=res["STOCH"],
                macd=res["MACD"],
                bollinger=res["Bollinger"],
                atr=res["ATR"],
                roc=res["ROC"],
                score=res["Score"],
                master_signal=res["Master Signal"],
                history=chart_history
            ))

        return ScreenerResponse(count=len(results), data=results)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))