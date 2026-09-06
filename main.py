"""
main.py
Execution orchestrator and Interactive CLI for Quantitative Portfolio Engine.
"""

import sys
import numpy as np
import pandas as pd

from technical.indicators import TechnicalScreener
from core.data_pipeline import MarketDataPipeline
from analytics.risk_metrics import PortfolioAnalytics
from backtesting.walk_forward import WalkForwardBacktester
from analytics.event_study import EventTester
from optimization.markowitz_slsqp import PortfolioOptimizer


def get_user_tickers(prompt="Enter tickers separated by commas (e.g., ETE.AT, ELPE.AT, TTWO): "):
    """Cleanly parse user ticker input, strip extra spaces, and uppercase."""
    raw_input = input(prompt)
    tickers = [ticker.strip().upper() for ticker in raw_input.split(',')]
    return [t for t in tickers if t]


def get_user_lookback():
    """Ask the user for historical timeframe."""
    try:
        val = input("Enter lookback years (Press Enter for 2): ").strip()
        return int(val) if val else 2
    except ValueError:
        print("[WARNING] Invalid number. Defaulting to 2 years.")
        return 2


def get_dynamic_constraints(num_assets: int):
    """
    Returns (min_weight, max_weight) based on portfolio size:
    - 2 assets: min 5%, max 75%
    - 3 to 10 assets: min 5%, max 50%
    - 11 to 20 assets: min 2%, max 50%
    - > 20 assets: min 0%, max 50%
    """
    if num_assets == 2:
        return 0.05, 0.75
    elif num_assets <= 10:
        return 0.05, 0.50
    elif num_assets <= 20:
        return 0.02, 0.50
    else:
        return 0.00, 0.50


def sanitize_downloaded_data(df: pd.DataFrame, min_days: int = 252, min_assets: int = 2):
    """
    Validates market data, removes columns that failed to download (all NaNs),
    and ensures adequate trading history remains.
    """
    if df.empty:
        print("\n[ERROR] No data downloaded. Please check ticker spelling.")
        return None

    all_nan_cols = df.columns[df.isna().all()]
    if not all_nan_cols.empty:
        print(f"\n[WARNING] Removing invalid/delisted tickers: {list(all_nan_cols)}")
        df = df.drop(columns=all_nan_cols)

    if len(df.columns) < min_assets:
        print(f"\n[ERROR] Need at least {min_assets} valid asset(s) to proceed. Got: {len(df.columns)}")
        return None

    clean_df = df.dropna()
    if len(clean_df) < min_days:
        print(f"\n[ERROR] Not enough overlapping trading days (Required: {min_days}, Found: {len(clean_df)}).")
        return None

    return clean_df


def main():
    base_currency = "EUR"

    print("=========================================================")
    print("      INITIALIZING QUANTITATIVE PORTFOLIO ENGINE         ")
    print("=========================================================\n")

    while True:
        print("1. Run Full Portfolio Optimization (SLSQP)")
        print("2. Run Walk-Forward Backtest (Out-of-Sample)")
        print("3. Run Event Study (Weekly Drop/Surge Tracker)")
        print("4. Run Technical Screener (Moving Averages)") 
        print("0. Exit Engine")
        print("=" * 50)

        choice = input("Select a module to execute (0-4): ").strip()

        # ==========================================
        # MODULE 1: PORTFOLIO OPTIMIZATION 
        # ==========================================
        if choice == '1':
            print("\n--- PORTFOLIO OPTIMIZATION ---")
            tickers = get_user_tickers()
            if not tickers:
                continue

            years = get_user_lookback()
            pipeline = MarketDataPipeline(tickers=tickers, base_currency=base_currency, lookback_years=years)
            raw_df = pipeline.load_clean_data(force_refresh=True)

            df = sanitize_downloaded_data(raw_df, min_days=252, min_assets=2)
            if df is None:
                continue

            daily_returns = df.pct_change().dropna()

            # Dynamic constraints calculation 
            min_wt, max_wt = get_dynamic_constraints(len(df.columns))

            print(f"\n[OPTIMIZATION] Calculating weights for {list(df.columns)}...")
            print(f"[CONSTRAINTS] Min Floor: {min_wt * 100:.0f}% | Max Cap: {max_wt * 100:.0f}%")

            optimal_dict = PortfolioOptimizer.maximize_sharpe(
                daily_returns, max_weight=max_wt, min_weight=min_wt
            )
            weights = np.array(list(optimal_dict.values()))

            print("\n--- OPTIMAL WEIGHTS ---")
            for ticker, weight in optimal_dict.items():
                print(f"{ticker}: {weight * 100:.2f}%")

            port_returns = daily_returns.dot(weights)
            tearsheet = PortfolioAnalytics.full_tearsheet(port_returns)
            print("\n--- RISK TEARSHEET ---")
            for metric, value in tearsheet.items():
                print(f"{metric:<38}: {value}")

        # ==========================================
        # MODULE 2: WALK-FORWARD BACKTEST 
        # ==========================================
        elif choice == '2':
            print("\n--- WALK-FORWARD BACKTEST ---")
            tickers = get_user_tickers()
            if not tickers:
                continue

            years = get_user_lookback()
            pipeline = MarketDataPipeline(tickers=tickers, base_currency=base_currency, lookback_years=years)
            raw_df = pipeline.load_clean_data(force_refresh=True)

            df = sanitize_downloaded_data(raw_df, min_days=252, min_assets=2)
            if df is None:
                continue

            daily_returns = df.pct_change().dropna()

            # Dynamic constraints calculation (Step C)
            min_wt, max_wt = get_dynamic_constraints(len(df.columns))

            print(f"\n[BACKTEST] Executing Out-of-Sample Walk-Forward on {list(df.columns)}...")
            print(f"[CONSTRAINTS] Min Floor: {min_wt * 100:.0f}% | Max Cap: {max_wt * 100:.0f}%")

            oos_returns, oos_weights, start_date, end_date = WalkForwardBacktester.run_out_of_sample(
                daily_returns, train_window_days=252, transaction_fee=0.001, max_weight=max_wt, min_weight=min_wt
            )
            print("\n--- YEAR 1: OPTIMAL WEIGHTS ---")
            for ticker, weight in oos_weights.items():
                print(f"{ticker}: {weight * 100:.2f}%")

            tearsheet = PortfolioAnalytics.full_tearsheet(oos_returns)
            print(f"\n--- YEAR 2: OOS RESULTS ({start_date} to {end_date}) ---")
            for metric, value in tearsheet.items():
                print(f"{metric:<38}: {value}")

        # ==========================================
        # MODULE 3: EVENT STUDY
        # ==========================================
        elif choice == '3':
            print("\n--- EVENT STUDY ---")
            target_ticker = input("Enter a single ticker to test (e.g., TSLA, ETE.AT): ").strip().upper()
            if not target_ticker:
                continue

            years = get_user_lookback()
            pipeline = MarketDataPipeline(tickers=[target_ticker], base_currency=base_currency, lookback_years=years)
            raw_df = pipeline.load_clean_data(force_refresh=True)

            df = sanitize_downloaded_data(raw_df, min_days=50, min_assets=1)
            if df is None or target_ticker not in df.columns:
                print(f"\n[ERROR] Ticker '{target_ticker}' not found or has insufficient price history.")
                continue

            try:
                threshold = float(input("Enter weekly threshold (e.g., -0.05 for drop, 0.03 for surge): "))
            except ValueError:
                print("[ERROR] Please enter a valid decimal number (like -0.05).")
                continue

            print(f"\n[EVENT STUDY] Testing {target_ticker} for {threshold * 100:.1f}% weekly events...")
            prices = df[target_ticker]
            results = EventTester.test_weekly_event(prices, threshold=threshold)

            print("\n--- EVENT STUDY RESULTS ---")
            for metric, value in results.items():
                print(f"{metric:<30}: {value}")

       # ==========================================
        # MODULE 4: TECHNICAL SCREENER
        # ==========================================
        elif choice == '4':
            print("\n--- TECHNICAL SCREENER ---")
            tickers = get_user_tickers("Enter tickers to screen (e.g., AAPL, TSLA, ALWN.AT): ")
            if not tickers:
                continue

            pipeline = MarketDataPipeline(tickers=tickers, base_currency=base_currency, lookback_years=2)
            raw_df = pipeline.load_clean_data(force_refresh=True)

            df = sanitize_downloaded_data(raw_df, min_days=200, min_assets=1)
            if df is None:
                continue

            print("\n" + "=" * 110)
            print(f"{'TICKER':<10} | {'PRICE':<8} | {'TREND':<6} | {'RSI':<4} | {'STOCH':<5} | {'MACD':<5} | {'BOLL':<7} | {'ATR %':<6} | {'1M ROC':<6} | {'MASTER SIGNAL'}")
            print("=" * 110)
            
            for ticker in df.columns:
                result = TechnicalScreener.generate_signals(df[ticker])
                
                print(f"{ticker:<10} | {result['Price']:<8} | {result['Trend']:<6} | {result['RSI']:<4} | {result['STOCH']:<5} | {result['MACD']:<5} | {result['Bollinger']:<7} | {result['ATR']:<6} | {result['ROC']:<6} | {result['Master Signal']}")
            print("=" * 110)

        elif choice == '0':
            print("\nShutting down engine. Goodbye.")
            sys.exit()

        else:
            print("\nInvalid selection. Please enter a number between 0 and 3.")


if __name__ == "__main__":
    main()