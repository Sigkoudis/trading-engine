"""
backtesting/walk_forward.py
Out-of-sample backtesting engine to validate portfolio weights.
"""

import numpy as np
import pandas as pd
from optimization.markowitz_slsqp import PortfolioOptimizer

class WalkForwardBacktester:
    @staticmethod
    def run_out_of_sample(daily_returns, train_window_days=252, transaction_fee=0.001):
        """
        Trains on Year 1, tests on Year 2, and applies a 0.1% broker fee.
        """
        if len(daily_returns) <= train_window_days:
            raise ValueError("Not enough data to split into train and test sets.")
            
        # 1. Split the data (Year 1 vs Year 2)
        train_data = daily_returns.iloc[:train_window_days]
        test_data = daily_returns.iloc[train_window_days:]
        
        # 2. Train the model (Optimize using ONLY Year 1)
        optimal_dict = PortfolioOptimizer.maximize_sharpe(train_data, max_weight=0.40)
        weights = np.array(list(optimal_dict.values()))
        
        # 3. Test the model (Walk forward into the unseen Year 2)
        out_of_sample_returns = test_data.dot(weights)
        
        # 4. Apply trading friction (simulating 0.1% broker fee to buy the assets)
        out_of_sample_returns.iloc[0] -= transaction_fee
        
        start_date = test_data.index[0].strftime('%Y-%m-%d')
        end_date = test_data.index[-1].strftime('%Y-%m-%d')
        
        return out_of_sample_returns, optimal_dict, start_date, end_date