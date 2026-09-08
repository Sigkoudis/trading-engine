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
            
            # --- 1. CALCULATE TECHNICALS FOR THIS SPECIFIC TICKER ---
            ticker_df = pd.DataFrame({'price': s})
            
            # Simple & Exponential Moving Averages
            ticker_df['sma_50'] = ticker_df['price'].rolling(window=50).mean()
            ticker_df['sma_100'] = ticker_df['price'].rolling(window=100).mean()
            ticker_df['sma_200'] = ticker_df['price'].rolling(window=200).mean()
            ticker_df['ema_9'] = ticker_df['price'].ewm(span=9, adjust=False).mean()
            ticker_df['ema_20'] = ticker_df['price'].ewm(span=20, adjust=False).mean()
            
            # Bollinger Bands
            ticker_df['std_20'] = ticker_df['price'].rolling(window=20).std()
            ticker_df['sma_20'] = ticker_df['price'].rolling(window=20).mean()
            ticker_df['upper_band'] = ticker_df['sma_20'] + (ticker_df['std_20'] * 2)
            ticker_df['lower_band'] = ticker_df['sma_20'] - (ticker_df['std_20'] * 2)

            # --- 2. HISTORICAL HIGHS / LOWS & PIVOT POINTS ---
            ath = float(s.max())
            atl = float(s.min())
            h_6m = float(s.tail(126).max()) if len(s) >= 126 else ath
            l_6m = float(s.tail(126).min()) if len(s) >= 126 else atl
            h_2y = float(s.tail(504).max()) if len(s) >= 504 else ath
            l_2y = float(s.tail(504).min()) if len(s) >= 504 else atl

            # Swing Pivot Calculation (Using 30-day swing window)
            swing_window = s.tail(30) if len(s) >= 30 else s
            p_high = float(swing_window.max())
            p_low = float(swing_window.min())
            p_close = float(s.iloc[-1])
            pivot_p = (p_high + p_low + p_close) / 3.0
            pivot_r1 = (2.0 * pivot_p) - p_low
            pivot_s1 = (2.0 * pivot_p) - p_high

            res = TechnicalScreener.generate_signals(s)
            
            if days == 1:
                if ticker_df.index.tz is None:
                    df_athens = ticker_df.copy()
                    df_athens.index = df_athens.index.tz_localize('UTC').tz_convert('Europe/Athens')
                else:
                    df_athens = ticker_df.copy()
                    df_athens.index = df_athens.index.tz_convert('Europe/Athens')

                last_day = df_athens.index[-1].date()
                day_data = df_athens[df_athens.index.date == last_day]
                filtered_data = day_data.between_time("10:30", "23:00")
                recent_data = filtered_data if not filtered_data.empty else day_data

                chart_history = []
                for idx, row in recent_data.iterrows():
                    chart_history.append({
                        "date": int(idx.timestamp() * 1000), 
                        "price": round(row['price'], 2),
                        "ema_9": round(row['ema_9'], 2) if not pd.isna(row['ema_9']) else None,
                        "ema_20": round(row['ema_20'], 2) if not pd.isna(row['ema_20']) else None,
                        "sma_50": round(row['sma_50'], 2) if not pd.isna(row['sma_50']) else None,
                        "sma_100": round(row['sma_100'], 2) if not pd.isna(row['sma_100']) else None,
                        "sma_200": round(row['sma_200'], 2) if not pd.isna(row['sma_200']) else None,
                        "upper_band": round(row['upper_band'], 2) if not pd.isna(row['upper_band']) else None,
                        "lower_band": round(row['lower_band'], 2) if not pd.isna(row['lower_band']) else None,
                        "ath": round(ath, 2), "atl": round(atl, 2),
                        "h_6m": round(h_6m, 2), "l_6m": round(l_6m, 2),
                        "h_2y": round(h_2y, 2), "l_2y": round(l_2y, 2),
                        "pivot": round(pivot_p, 2), "r1": round(pivot_r1, 2), "s1": round(pivot_s1, 2)
                    })
            
            elif days == 7:
                if ticker_df.index.tz is None:
                    df_athens = ticker_df.copy()
                    df_athens.index = df_athens.index.tz_localize('UTC').tz_convert('Europe/Athens')
                else:
                    df_athens = ticker_df.copy()
                    df_athens.index = df_athens.index.tz_convert('Europe/Athens')

                cutoff = df_athens.index[-1] - pd.Timedelta(days=7)
                week_data = df_athens.loc[cutoff:]
                filtered_data = week_data.between_time("10:30", "23:00")
                recent_data = filtered_data if not filtered_data.empty else week_data

                chart_history = []
                for idx, row in recent_data.iterrows():
                    chart_history.append({
                        "date": int(idx.timestamp() * 1000), 
                        "price": round(row['price'], 2),
                        "ema_9": round(row['ema_9'], 2) if not pd.isna(row['ema_9']) else None,
                        "ema_20": round(row['ema_20'], 2) if not pd.isna(row['ema_20']) else None,
                        "sma_50": round(row['sma_50'], 2) if not pd.isna(row['sma_50']) else None,
                        "sma_100": round(row['sma_100'], 2) if not pd.isna(row['sma_100']) else None,
                        "sma_200": round(row['sma_200'], 2) if not pd.isna(row['sma_200']) else None,
                        "upper_band": round(row['upper_band'], 2) if not pd.isna(row['upper_band']) else None,
                        "lower_band": round(row['lower_band'], 2) if not pd.isna(row['lower_band']) else None,
                        "ath": round(ath, 2), "atl": round(atl, 2),
                        "h_6m": round(h_6m, 2), "l_6m": round(l_6m, 2),
                        "h_2y": round(h_2y, 2), "l_2y": round(l_2y, 2),
                        "pivot": round(pivot_p, 2), "r1": round(pivot_r1, 2), "s1": round(pivot_s1, 2)
                    })
            
            else:
                recent_data = ticker_df.tail(days)
                chart_history = []
                for idx, row in recent_data.iterrows():
                    chart_history.append({
                        "date": idx.strftime("%Y-%m-%d"), 
                        "price": round(row['price'], 2),
                        "ema_9": round(row['ema_9'], 2) if not pd.isna(row['ema_9']) else None,
                        "ema_20": round(row['ema_20'], 2) if not pd.isna(row['ema_20']) else None,
                        "sma_50": round(row['sma_50'], 2) if not pd.isna(row['sma_50']) else None,
                        "sma_100": round(row['sma_100'], 2) if not pd.isna(row['sma_100']) else None,
                        "sma_200": round(row['sma_200'], 2) if not pd.isna(row['sma_200']) else None,
                        "upper_band": round(row['upper_band'], 2) if not pd.isna(row['upper_band']) else None,
                        "lower_band": round(row['lower_band'], 2) if not pd.isna(row['lower_band']) else None,
                        "ath": round(ath, 2), "atl": round(atl, 2),
                        "h_6m": round(h_6m, 2), "l_6m": round(l_6m, 2),
                        "h_2y": round(h_2y, 2), "l_2y": round(l_2y, 2),
                        "pivot": round(pivot_p, 2), "r1": round(pivot_r1, 2), "s1": round(pivot_s1, 2)
                    })

            results.append(IndicatorResult(
                ticker=ticker, price=res["Price"], trend=res["Trend"], rsi=res["RSI"],
                stoch=res["STOCH"], macd=res["MACD"], bollinger=res["Bollinger"],
                atr=res["ATR"], roc=res["ROC"], score=res["Score"],
                master_signal=res["Master Signal"], history=chart_history
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
async def run_backtest(
    tickers: str = Query(..., description="Comma-separated ticker symbols"),
    base_currency: str = Query("EUR"),
    start_date: str = Query("2025-01-01", description="Start Date"),
    end_date: str = Query(None, description="End Date")
):
    clean_tickers = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    try:
        # Fetch 5 years of data (1 year to train, 1 year to test out-of-sample)
        pipeline = MarketDataPipeline(tickers=clean_tickers, base_currency=base_currency, lookback_years=5)
        # Grab a 5-year buffer of data so we have plenty of history to filter from
        raw_df = pipeline.load_clean_data(target_days=1825, force_refresh=True)
        df = sanitize_downloaded_data(raw_df, min_days=50, min_assets=len(clean_tickers))
        
        # --- NEW DATE SLICER ---
        # Pandas DatetimeIndex naturally understands string dates!
        if end_date:
            df = df.loc[start_date:end_date]
        else:
            df = df.loc[start_date:]
            
        if df.empty or len(df) < 20:
            raise HTTPException(status_code=400, detail="Not enough trading days found in this specific date range.")

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