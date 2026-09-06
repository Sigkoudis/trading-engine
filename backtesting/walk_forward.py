"""
backtesting/walk_forward.py
Walk-forward backtesting engine for out-of-sample portfolio validation.
"""

import pandas as pd
import numpy as np
from optimization.markowitz_slsqp import PortfolioOptimizer

class WalkForwardBacktester:
    @staticmethod
    def run_out_of_sample(returns, train_window_days=252, transaction_fee=0.001, max_weight=0.50, min_weight=0.0):
        """Trains on Year 1, tests on Year 2, and applies a broker fee."""
        
        if len(returns) <= train_window_days:
            raise ValueError("Not enough data to split into train and test sets.")
            
        # 1. Split the data (Year 1 vs Year 2)
        train_data = returns.iloc[:train_window_days]
        test_data = returns.iloc[train_window_days:]
        
        # 2. Train the model (Optimize using ONLY Year 1)
        optimal_weights = PortfolioOptimizer.maximize_sharpe(
            train_data, 
            max_weight=max_weight, 
            min_weight=min_weight
        )
        
        # Convert dictionary of weights to a numpy array matching the column order
        weights_array = np.array([optimal_weights[col] for col in returns.columns])
        
        # 3. Test the model (Apply weights to Year 2 out-of-sample data)
        oos_returns = test_data.dot(weights_array)
        
        # 4. Apply a one-time transaction fee for the initial portfolio balancing
        oos_returns.iloc[0] -= transaction_fee
        
        start_date = test_data.index[0].strftime('%Y-%m-%d')
        end_date = test_data.index[-1].strftime('%Y-%m-%d')
        
        return oos_returns, optimal_weights, start_date, end_date