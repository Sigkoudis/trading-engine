"""
api/routes.py
REST API endpoints for the quantitative trading engine.
"""

import yfinance as yf
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

def build_chart_payload(recent_data: pd.DataFrame, is_intraday: bool, stat_dict: dict) -> list:
    """Helper function to cleanly serialize the chart dataframe into a React-friendly JSON list."""
    chart_history = []
    for idx, row in recent_data.iterrows():
        # Intraday needs milliseconds for Recharts, Daily needs string dates
        date_val = int(idx.timestamp() * 1000) if is_intraday else idx.strftime("%Y-%m-%d")
        
        chart_history.append({
            "date": date_val, 
            "price": round(row['price'], 2),
            "ema_9": round(row['ema_9'], 2) if not pd.isna(row['ema_9']) else None,
            "ema_20": round(row['ema_20'], 2) if not pd.isna(row['ema_20']) else None,
            "sma_50": round(row['sma_50'], 2) if not pd.isna(row['sma_50']) else None,
            "sma_100": round(row['sma_100'], 2) if not pd.isna(row['sma_100']) else None,
            "sma_200": round(row['sma_200'], 2) if not pd.isna(row['sma_200']) else None,
            "upper_band": round(row['upper_band'], 2) if not pd.isna(row['upper_band']) else None,
            "lower_band": round(row['lower_band'], 2) if not pd.isna(row['lower_band']) else None,
            **stat_dict  # Instantly unpacks all the ATH/ATL/Pivots into the dictionary!
        })
    return chart_history

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
        raw_df = pipeline.load_clean_data(target_days=days, force_refresh=True)
        df = sanitize_downloaded_data(raw_df, min_days=50, min_assets=1)
        
        if df is None or df.empty:
            raise HTTPException(status_code=404, detail="No sufficient historical data found.")

        results: List[IndicatorResult] = []
        for ticker in df.columns:
            s = df[ticker].dropna()
            
            # --- 1. CALCULATE TECHNICALS FOR THIS SPECIFIC TICKER ---
            ticker_df = pd.DataFrame({'price': s})
            
            ticker_df['sma_50'] = ticker_df['price'].rolling(window=50).mean()
            ticker_df['sma_100'] = ticker_df['price'].rolling(window=100).mean()
            ticker_df['sma_200'] = ticker_df['price'].rolling(window=200).mean()
            ticker_df['ema_9'] = ticker_df['price'].ewm(span=9, adjust=False).mean()
            ticker_df['ema_20'] = ticker_df['price'].ewm(span=20, adjust=False).mean()
            
            ticker_df['std_20'] = ticker_df['price'].rolling(window=20).std()
            ticker_df['sma_20'] = ticker_df['price'].rolling(window=20).mean()
            ticker_df['upper_band'] = ticker_df['sma_20'] + (ticker_df['std_20'] * 2)
            ticker_df['lower_band'] = ticker_df['sma_20'] - (ticker_df['std_20'] * 2)

            # --- 2. HISTORICAL HIGHS / LOWS & PIVOT POINTS ---
            ath, atl = float(s.max()), float(s.min())
            h_6m = float(s.tail(126).max()) if len(s) >= 126 else ath
            l_6m = float(s.tail(126).min()) if len(s) >= 126 else atl
            h_2y = float(s.tail(504).max()) if len(s) >= 504 else ath
            l_2y = float(s.tail(504).min()) if len(s) >= 504 else atl

            swing_window = s.tail(30) if len(s) >= 30 else s
            p_high, p_low, p_close = float(swing_window.max()), float(swing_window.min()), float(s.iloc[-1])
            pivot_p = (p_high + p_low + p_close) / 3.0

            # Pack static values safely into a dictionary to pass to the helper function
            stat_dict = {
                "ath": round(ath, 2), "atl": round(atl, 2),
                "h_6m": round(h_6m, 2), "l_6m": round(l_6m, 2),
                "h_2y": round(h_2y, 2), "l_2y": round(l_2y, 2),
                "pivot": round(pivot_p, 2), 
                "r1": round((2.0 * pivot_p) - p_low, 2), 
                "s1": round((2.0 * pivot_p) - p_high, 2)
            }

            # --- 3. TIMEZONE ALIGNMENT & SPLICING ---
            is_intraday = days in [1, 7]
            if is_intraday:
                # Handle Timezones cleanly once
                df_tz = ticker_df.tz_localize('UTC').tz_convert('Europe/Athens') if ticker_df.index.tz is None else ticker_df.tz_convert('Europe/Athens')
                
                if days == 1:
                    last_day = df_tz.index[-1].date()
                    day_data = df_tz[df_tz.index.date == last_day]
                else: # days == 7
                    cutoff = df_tz.index[-1] - pd.Timedelta(days=7)
                    day_data = df_tz.loc[cutoff:]
                
                # Filter out dead hours
                filtered_data = day_data.between_time("10:30", "23:00")
                recent_data = filtered_data if not filtered_data.empty else day_data
            else:
                recent_data = ticker_df.tail(days)

            # Build the payload using the single helper function
            chart_history = build_chart_payload(recent_data, is_intraday, stat_dict)
            res = TechnicalScreener.generate_signals(s)

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
        pipeline = MarketDataPipeline(tickers=clean_tickers, base_currency=base_currency, lookback_years=1)
        raw_df = pipeline.load_clean_data(target_days=252, force_refresh=True)
        df = sanitize_downloaded_data(raw_df, min_days=100, min_assets=len(clean_tickers))
        
        if df is None:
            raise HTTPException(status_code=404, detail="Insufficient data to optimize this portfolio.")

        daily_returns = df.pct_change().dropna()
        adjusted_returns = daily_returns.copy()
        
        for ticker in adjusted_returns.columns:
            try:
                ta_results = TechnicalScreener.generate_signals(df[ticker])
                score = int(ta_results["Score"])
                adjusted_returns[ticker] += (score * 0.0002) 
            except Exception:
                pass 

        optimal_weights = PortfolioOptimizer.maximize_sharpe(
            adjusted_returns, max_weight=max_weight, min_weight=min_weight
        )

        weights_array = np.array([optimal_weights[col] for col in daily_returns.columns])
        simulated_port_returns = daily_returns.dot(weights_array)
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
        pipeline = MarketDataPipeline(tickers=clean_tickers, base_currency=base_currency, lookback_years=5)
        raw_df = pipeline.load_clean_data(target_days=1825, force_refresh=True)
        df = sanitize_downloaded_data(raw_df, min_days=50, min_assets=len(clean_tickers))
        
        if end_date:
            df = df.loc[start_date:end_date]
        else:
            df = df.loc[start_date:]
            
        if df.empty or len(df) < 20:
            raise HTTPException(status_code=400, detail="Not enough trading days found in this specific date range.")

        daily_returns = df.pct_change().dropna()

        oos_returns, used_weights, test_start, test_end = WalkForwardBacktester.run_out_of_sample(
            daily_returns, train_window_days=252
        )

        cumulative_growth = (1 + oos_returns).cumprod() * 10000
        equity_curve = [
            {"date": idx.strftime("%Y-%m-%d"), "value": round(val, 2)} 
            for idx, val in cumulative_growth.items()
        ]

        tearsheet = PortfolioAnalytics.full_tearsheet(oos_returns)

        return {
            "test_period": f"{test_start} to {test_end}",
            "weights_used": used_weights,
            "tearsheet": tearsheet,
            "equity_curve": equity_curve
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ticker-tape")
async def get_ticker_tape():
    tape_tickers = [
        # Core Benchmarks
        "^GSPC", "^IXIC", "^DJI", "GD.AT", 
        # Global Pulse
        "EURUSD=X", "GC=F", 
        # Magnificent 7
        "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA",
        # Greek Top 10 Blue Chips
        "ETE.AT", "OPAP.AT", "MYTIL.AT", "HTO.AT", "EUROB.AT", 
        "ALPHA.AT", "PPC.AT", "BELA.AT", "MOH.AT", "TENERGY.AT",
        # Crypto
        "BTC-USD"
    ]
    try:
        # Fetch 5 days of data to guarantee we capture a 1D change even over weekends
        raw = yf.download(tape_tickers, period="5d", interval="1d", progress=False)['Close']
        if isinstance(raw, pd.Series):
            raw = raw.to_frame()
            
        tape_data = []
        for ticker in tape_tickers:
            if ticker in raw.columns:
                s = raw[ticker].dropna()
                if len(s) >= 2:
                    latest = s.iloc[-1]
                    prev = s.iloc[-2]
                    pct_change = ((latest - prev) / prev) * 100
                    
                    # Clean up the ticker names for the UI
                    display_name = ticker.replace("^", "").replace("=X", "").replace("=F", "")
                    if display_name == "GSPC": display_name = "S&P 500"
                    if display_name == "IXIC": display_name = "NASDAQ"
                    if display_name == "DJI": display_name = "DOW"
                    if display_name == "GD.AT": display_name = "ATHEX"
                    if display_name == "BELA.AT": display_name = "JUMBO.AT"
                    
                    tape_data.append({
                        "ticker": display_name,
                        "price": round(float(latest), 2),
                        "change": round(float(pct_change), 2)
                    })
        return {"data": tape_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))