"""
analytics/risk_metrics.py
Institutional risk & return analytics: Downside Deviation, VaR, CVaR, Drawdowns.
"""

import pandas as pd
import numpy as np


class PortfolioAnalytics:
    @staticmethod
    def calculate_drawdown_series(cumulative_returns: pd.Series) -> pd.Series:
        """Calculates historical drawdown percentage from previous high-water mark."""
        running_max = cumulative_returns.cummax()
        drawdown = (cumulative_returns - running_max) / running_max
        return drawdown

    @staticmethod
    def max_drawdown(daily_returns: pd.Series) -> float:
        """Maximum peak-to-trough drop."""
        cumulative = (1 + daily_returns).cumprod()
        dd = PortfolioAnalytics.calculate_drawdown_series(cumulative)
        return float(dd.min())

    @staticmethod
    def downside_deviation(daily_returns: pd.Series, target_return: float = 0.0) -> float:
        """Annualized downside deviation (semi-variance below target return)."""
        underperformance = daily_returns - target_return
        negative_returns = underperformance[underperformance < 0]
        if len(negative_returns) == 0:
            return 0.0
        return float(np.sqrt(np.mean(negative_returns**2)) * np.sqrt(252))

    @staticmethod
    def sortino_ratio(daily_returns: pd.Series, risk_free_rate: float = 0.03) -> float:
        """Calculates Sortino Ratio (punishes downside volatility only)."""
        ann_return = daily_returns.mean() * 252
        dd = PortfolioAnalytics.downside_deviation(daily_returns, target_return=risk_free_rate / 252)
        if dd == 0:
            return 0.0
        return (ann_return - risk_free_rate) / dd

    @staticmethod
    def calmar_ratio(daily_returns: pd.Series) -> float:
        """Calculates Calmar Ratio: Return / Absolute Max Drawdown."""
        ann_return = daily_returns.mean() * 252
        mdd = abs(PortfolioAnalytics.max_drawdown(daily_returns))
        if mdd == 0:
            return 0.0
        return ann_return / mdd

    @staticmethod
    def value_at_risk_historical(daily_returns: pd.Series, alpha: float = 0.05) -> float:
        """
        Historical Value at Risk (VaR) at (1 - alpha) confidence level.
        Default 95% confidence (alpha = 0.05). Returns daily loss threshold.
        """
        return float(np.percentile(daily_returns, alpha * 100))

    @staticmethod
    def conditional_value_at_risk(daily_returns: pd.Series, alpha: float = 0.05) -> float:
        """
        Conditional VaR (CVaR / Expected Shortfall).
        Average loss on days that breach the VaR threshold.
        """
        var = PortfolioAnalytics.value_at_risk_historical(daily_returns, alpha)
        breached_losses = daily_returns[daily_returns <= var]
        if len(breached_losses) == 0:
            return var
        return float(breached_losses.mean())

    @classmethod
    def full_tearsheet(cls, daily_returns: pd.Series, risk_free_rate: float = 0.03) -> dict:
        """Generate a complete institutional risk snapshot."""
        ann_return = daily_returns.mean() * 252
        ann_vol = daily_returns.std() * np.sqrt(252)
        sharpe = (ann_return - risk_free_rate) / ann_vol if ann_vol > 0 else 0.0
        
        return {
            "Annualized Return": f"{ann_return * 100:.2f}%",
            "Annualized Volatility": f"{ann_vol * 100:.2f}%",
            "Sharpe Ratio": f"{sharpe:.2f}",
            "Sortino Ratio": f"{cls.sortino_ratio(daily_returns, risk_free_rate):.2f}",
            "Calmar Ratio": f"{cls.calmar_ratio(daily_returns):.2f}",
            "Max Drawdown": f"{cls.max_drawdown(daily_returns) * 100:.2f}%",
            "Daily VaR (95%)": f"{cls.value_at_risk_historical(daily_returns, 0.05) * 100:.2f}%",
            "Daily CVaR (95% - Expected Shortfall)": f"{cls.conditional_value_at_risk(daily_returns, 0.05) * 100:.2f}%",
        }