"""
optimization/markowitz_slsqp.py
Mathematical portfolio optimizer using Sequential Least Squares Programming.
"""

import numpy as np
from scipy.optimize import minimize
import pandas as pd

class PortfolioOptimizer:
    @staticmethod
    def calculate_portfolio_metrics(weights, expected_returns, cov_matrix, risk_free_rate=0.03):
        port_return = np.sum(expected_returns * weights) * 252
        port_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))) * np.sqrt(252)
        sharpe_ratio = (port_return - risk_free_rate) / port_volatility
        return port_return, port_volatility, sharpe_ratio

    @staticmethod
    def negative_sharpe(weights, expected_returns, cov_matrix, risk_free_rate):
        metrics = PortfolioOptimizer.calculate_portfolio_metrics(weights, expected_returns, cov_matrix, risk_free_rate)
        return -metrics[2] 

    @staticmethod
    def maximize_sharpe(daily_returns, risk_free_rate=0.03, max_weight=0.40):
        num_assets = len(daily_returns.columns)
        expected_returns = daily_returns.mean()
        cov_matrix = daily_returns.cov()

        initial_guess = np.array(num_assets * [1. / num_assets])
        bounds = tuple((0.0, max_weight) for _ in range(num_assets))
        constraints = ({'type': 'eq', 'fun': lambda w: np.sum(w) - 1.0})

        result = minimize(
            PortfolioOptimizer.negative_sharpe,
            initial_guess,
            args=(expected_returns, cov_matrix, risk_free_rate),
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )

        optimal_weights = result.x
        return dict(zip(daily_returns.columns, optimal_weights))