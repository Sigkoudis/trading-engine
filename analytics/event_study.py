"""
analytics/event_study.py
Tests custom market events using strict weekly calendar intervals.
"""

import pandas as pd

class EventTester:
    @staticmethod
    def test_weekly_event(prices: pd.Series, threshold: float = -0.05):
        weekly_prices = prices.resample('W-FRI').last()
        this_week_return = weekly_prices.pct_change()
        next_week_return = this_week_return.shift(-1)
        
        df = pd.DataFrame({
            'this_week': this_week_return,
            'next_week': next_week_return
        }).dropna()
        
        # --- THE SMART THRESHOLD ---
        if threshold < 0:
            trigger_weeks = df[df['this_week'] <= threshold]
            event_label = f"Total {threshold*100:.1f}% Drop Weeks"
        else:
            trigger_weeks = df[df['this_week'] >= threshold]
            event_label = f"Total {threshold*100:.1f}% Surge Weeks"
            
        total_events = len(trigger_weeks)
        wins = (trigger_weeks['next_week'] > 0).sum()
        losses = (trigger_weeks['next_week'] < 0).sum()
        
        net_score = wins - losses
        win_rate = (wins / total_events * 100) if total_events > 0 else 0
        
        return {
            event_label: total_events,
            "Wins (Next week was green)": wins,
            "Losses (Next week was red)": losses,
            "Net Score Counter": net_score,
            "Win Rate (Outcome)": f"{win_rate:.2f}%"
        }