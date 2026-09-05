"""
main.py
Execution orchestrator and Interactive CLI for Quantitative Portfolio Engine.
"""

from core.data_pipeline import MarketDataPipeline
from analytics.risk_metrics import PortfolioAnalytics
from backtesting.walk_forward import WalkForwardBacktester
from analytics.event_study import EventTester
from optimization.markowitz_slsqp import PortfolioOptimizer
import pandas as pd
import numpy as np
import sys

def get_user_tickers(prompt="Enter tickers separated by commas (e.g., ETE.AT, ELPE.AT, TTWO): "):
    """Helper function to cleanly parse user ticker input."""
    raw_input = input(prompt)
    # Split by comma, strip empty spaces, and convert to uppercase
    tickers = [ticker.strip().upper() for ticker in raw_input.split(',')]
    return [t for t in tickers if t] # Remove any accidental blank entries

def main():
    base_currency = "EUR"

    print("=========================================================")
    print("      INITIALIZING QUANTITATIVE PORTFOLIO ENGINE         ")
    print("=========================================================\n")

    while True:
        print("\n" + "="*50)
        print("                 MAIN DASHBOARD")
        print("="*50)
        print("1. Run Full Portfolio Optimization (SLSQP)")
        print("2. Run Walk-Forward Backtest (Out-of-Sample)")
        print("3. Run Event Study (Weekly Crash Tracker)")
        print("0. Exit Engine")
        print("="*50)
        
        choice = input("Select a module to execute (0-3): ").strip()

        if choice == '1':
            print("\n--- PORTFOLIO OPTIMIZATION ---")
            tickers = get_user_tickers()
            if not tickers:
                continue
                
            pipeline = MarketDataPipeline(tickers=tickers, base_currency=base_currency, lookback_years=2)
            df = pipeline.load_clean_data(force_refresh=True)
            daily_returns = df.pct_change().dropna()
            
            print("\n[OPTIMIZATION] Calculating optimal weights (2-Year History)...")
            optimal_dict = PortfolioOptimizer.maximize_sharpe(daily_returns, max_weight=0.40)
            weights = np.array(list(optimal_dict.values()))
            
            print("\n--- OPTIMAL WEIGHTS ---")
            for ticker, weight in optimal_dict.items():
                print(f"{ticker}: {weight * 100:.2f}%")
                
            port_returns = daily_returns.dot(weights)
            tearsheet = PortfolioAnalytics.full_tearsheet(port_returns)
            print("\n--- RISK TEARSHEET ---")
            for metric, value in tearsheet.items():
                print(f"{metric:<38}: {value}")

        elif choice == '2':
            print("\n--- WALK-FORWARD BACKTEST ---")
            tickers = get_user_tickers()
            if not tickers:
                continue
                
            pipeline = MarketDataPipeline(tickers=tickers, base_currency=base_currency, lookback_years=2)
            df = pipeline.load_clean_data(force_refresh=True)
            daily_returns = df.pct_change().dropna()
            
            print("\n[BACKTEST] Executing Out-of-Sample Walk-Forward...")
            oos_returns, oos_weights, start_date, end_date = WalkForwardBacktester.run_out_of_sample(
                daily_returns, train_window_days=252, transaction_fee=0.001
            )
            print("\n--- YEAR 1: OPTIMAL WEIGHTS ---")
            for ticker, weight in oos_weights.items():
                print(f"{ticker}: {weight * 100:.2f}%")
                
            tearsheet = PortfolioAnalytics.full_tearsheet(oos_returns)
            print(f"\n--- YEAR 2: OOS RESULTS ({start_date} to {end_date}) ---")
            for metric, value in tearsheet.items():
                print(f"{metric:<38}: {value}")

        elif choice == '3':
            print("\n--- EVENT STUDY ---")
            target_ticker = input("Enter a single ticker to test (e.g., TSLA, ETE.AT): ").strip().upper()
            if not target_ticker:
                continue
                
            # Fetch data for this specific stock
            pipeline = MarketDataPipeline(tickers=[target_ticker], base_currency=base_currency, lookback_years=2)
            df = pipeline.load_clean_data(force_refresh=True)
            
            # --- THE SAFETY NET ---
            if target_ticker not in df.columns:
                print(f"\n[ERROR] Could not find '{target_ticker}'. Did you misspell the ticker symbol?")
                continue
            # ----------------------
            
            threshold = float(input("Enter weekly drop threshold (e.g., -0.05 for -5%): "))
            print(f"\n[EVENT STUDY] Testing {target_ticker} for {threshold*100:.1f}% weekly drops...")
            
            prices = df[target_ticker]
            results = EventTester.test_weekly_crash_rebound(prices, drop_threshold=threshold)
            
            print("\n--- EVENT STUDY RESULTS ---")
            for metric, value in results.items():
                print(f"{metric:<30}: {value}")

        elif choice == '0':
            print("\nShutting down engine. Goodbye.")
            sys.exit()

        else:
            print("\nInvalid selection. Please enter a number between 0 and 3.")

if __name__ == "__main__":
    main()