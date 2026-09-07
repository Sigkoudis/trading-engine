"""
api/routes.py
REST API endpoints for the quantitative trading engine.
"""

from optimization.markowitz_slsqp import PortfolioOptimizer
from backtesting.walk_forward import WalkForwardBacktester
from analytics.risk_metrics import PortfolioAnalytics
from analytics.event_study import EventTester
import numpy as np

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
    base_currency: str = Query("EUR", description="Portfolio base currency"),
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
            
            if days == 1:
                # 1. Convert timestamp index to Athens local time
                if s.index.tz is None:
                    s_athens = s.copy()
                    s_athens.index = s_athens.index.tz_localize('UTC').tz_convert('Europe/Athens')
                else:
                    s_athens = s.copy()
                    s_athens.index = s_athens.index.tz_convert('Europe/Athens')

                # 2. Extract only the last trading day
                last_day = s_athens.index[-1].date()
                day_data = s_athens[s_athens.index.date == last_day]
                
                # 3. Filter strictly between Greek Market Open (10:30) and US Market Close (23:00)
                filtered_data = day_data.between_time("10:30", "23:00")
                recent_data = filtered_data if not filtered_data.empty else day_data

                chart_history = [{"date": int(idx.timestamp() * 1000), "price": round(val, 2)} for idx, val in recent_data.items()]
            
            elif days == 7:
                if s.index.tz is None:
                    s_athens = s.copy()
                    s_athens.index = s_athens.index.tz_localize('UTC').tz_convert('Europe/Athens')
                else:
                    s_athens = s.copy()
                    s_athens.index = s_athens.index.tz_convert('Europe/Athens')

                cutoff = s_athens.index[-1] - pd.Timedelta(days=7)
                week_data = s_athens.loc[cutoff:]
                
                # Strip out overnight dead hours for the weekly view as well
                filtered_data = week_data.between_time("10:30", "23:00")
                recent_data = filtered_data if not filtered_data.empty else week_data

                chart_history = [{"date": int(idx.timestamp() * 1000), "price": round(val, 2)} for idx, val in recent_data.items()]
            
            else:
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
@router.get("/optimize")

async def build_optimal_portfolio(
    tickers: str = Query(..., description="Comma-separated ticker symbols"),
    base_currency: str = Query("EUR"),
    max_weight: float = Query(0.40, description="Max allocation per asset"),
    min_weight: float = Query(0.00, description="Min allocation per asset")
):
    clean_tickers = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if len(clean_tickers) < 2:
        raise HTTPException(status_code=400, detail="Portfolio optimization requires at least 2 assets.")

    try:
        # Fetch 1 year of data for optimization training
        pipeline = MarketDataPipeline(tickers=clean_tickers, base_currency=base_currency, lookback_years=1)
        raw_df = pipeline.load_clean_data(target_days=252, force_refresh=True)
        df = sanitize_downloaded_data(raw_df, min_days=100, min_assets=len(clean_tickers))
        
        if df is None:
            raise HTTPException(status_code=404, detail="Insufficient data to optimize this portfolio.")

        # Calculate standard daily returns
        daily_returns = df.pct_change().dropna()
        
        # ---------------------------------------------------------
        # ALPHA OVERLAY: TECHNICAL ANALYSIS INTEGRATION
        # We create an adjusted returns dataframe to trick the solver.
        # ---------------------------------------------------------
        adjusted_returns = daily_returns.copy()
        
        for ticker in adjusted_returns.columns:
            try:
                # Generate TA score for this specific asset
                ta_results = TechnicalScreener.generate_signals(df[ticker])
                score = int(ta_results["Score"])
                
                # Boost/Penalty: 2 basis points (0.02%) daily expected return per TA score point
                adjusted_returns[ticker] += (score * 0.0002) 
            except Exception as e:
                pass # If TA fails for any reason, just use standard returns
        # ---------------------------------------------------------

        # Optimize using the ALPHA-ADJUSTED returns
        optimal_weights = PortfolioOptimizer.maximize_sharpe(
            adjusted_returns, max_weight=max_weight, min_weight=min_weight
        )

        # Apply weights to the ACTUAL historical returns to get realistic tearsheet metrics
        weights_array = np.array([optimal_weights[col] for col in daily_returns.columns])
        simulated_port_returns = daily_returns.dot(weights_array)

        # Generate the institutional tearsheet
        tearsheet = PortfolioAnalytics.full_tearsheet(simulated_port_returns)

        return {
            "weights": optimal_weights,
            "tearsheet": tearsheet
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/backtest")
async def walk_forward_backtest(
    tickers: str = Query(...),
    base_currency: str = Query("EUR")
):
    clean_tickers = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    try:
        # Fetch 2 years of data (1 year to train, 1 year to test out-of-sample)
        pipeline = MarketDataPipeline(tickers=clean_tickers, base_currency=base_currency, lookback_years=2)
        raw_df = pipeline.load_clean_data(target_days=504, force_refresh=True)
        df = sanitize_downloaded_data(raw_df, min_days=400, min_assets=len(clean_tickers))

        if df is None:
             raise HTTPException(status_code=404, detail="Insufficient data for a 2-year walk-forward test.")

        daily_returns = df.pct_change().dropna()

        # Run Walk-Forward engine
        oos_returns, used_weights, start_date, end_date = WalkForwardBacktester.run_out_of_sample(
            daily_returns, train_window_days=252
        )

        # Calculate compound growth of $10,000 invested out-of-sample
        cumulative_growth = (1 + oos_returns).cumprod() * 10000
        
        # Format the equity curve for React Recharts
        equity_curve = [
            {"date": idx.strftime("%Y-%m-%d"), "value": round(val, 2)} 
            for idx, val in cumulative_growth.items()
        ]

        tearsheet = PortfolioAnalytics.full_tearsheet(oos_returns)

        return {
            "test_period": f"{start_date} to {end_date}",
            "weights_used": used_weights,
            "tearsheet": tearsheet,
            "equity_curve": equity_curve
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))