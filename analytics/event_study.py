"""
analytics/event_study.py
Tests custom market events using strict weekly calendar intervals.
"""

import pandas as pd

class EventTester:
    @staticmethod
    def test_weekly_crash_rebound(prices: pd.Series, drop_threshold: float = -0.05):
        """
        Compresses data into strict calendar weeks (Friday-to-Friday).
        Checks if a full week closed down by the threshold, and checks the following week's close.
        """
        # 1. Compress daily data into strictly weekly data (End of Week / Friday Close)
        weekly_prices = prices.resample('W-FRI').last()
        
        # 2. Calculate the return for THIS week (Friday vs Last Friday)
        this_week_return = weekly_prices.pct_change()
        
        # 3. Calculate the return for NEXT week
        next_week_return = this_week_return.shift(-1)
        
        # Combine into one clean table
        df = pd.DataFrame({
            'this_week': this_week_return,
            'next_week': next_week_return
        }).dropna()
        
        # 4. Filter to only the weeks that crashed by our threshold
        crash_weeks = df[df['this_week'] <= drop_threshold]
        
        # 5. Count the outcomes
        total_events = len(crash_weeks)
        wins = (crash_weeks['next_week'] > 0).sum()
        losses = (crash_weeks['next_week'] < 0).sum()
        
        net_score = wins - losses
        win_rate = (wins / total_events * 100) if total_events > 0 else 0
        
        return {
            "Total -5% Crash Weeks": total_events,
            "Wins (Next week was green)": wins,
            "Losses (Next week was red)": losses,
            "Net Score Counter": net_score,
            "Win Rate (Bounce)": f"{win_rate:.2f}%"
        }