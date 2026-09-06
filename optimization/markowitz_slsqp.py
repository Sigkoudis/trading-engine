"""
optimization/markowitz_slsqp.py
Portfolio optimization using Sequential Least Squares Programming (SLSQP).
"""

import numpy as np
import pandas as pd
from scipy.optimize import minimize


class PortfolioOptimizer:
    @staticmethod
    def maximize_sharpe(daily_returns: pd.DataFrame, max_weight: float = 0.50, min_weight: float = 0.0, risk_free_rate: float = 0.02):
        num_assets = len(daily_returns.columns)
        expected_returns = daily_returns.mean()
        cov_matrix = daily_returns.cov()

        initial_guess = np.array(num_assets * [1.0 / num_assets])
        
        # Enforce both dynamic floor and ceiling
        bounds = tuple((min_weight, max_weight) for _ in range(num_assets))
        constraints = ({'type': 'eq', 'fun': lambda w: np.sum(w) - 1.0})

        def negative_sharpe(weights):
            port_return = np.sum(expected_returns * weights) * 252
            port_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix * 252, weights)))
            if port_volatility == 0:
                return 0.0
            return -(port_return - risk_free_rate) / port_volatility

        result = minimize(
            negative_sharpe,
            initial_guess,
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )

        if not result.success:
            raise ValueError(f"Optimization failed: {result.message}")

        return dict(zip(daily_returns.columns, np.round(result.x, 4)))