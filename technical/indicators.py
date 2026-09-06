"""
technical/indicators.py
Mathematical calculations for Technical Analysis indicators.
"""

import pandas as pd
import numpy as np

class TechnicalScreener:
    
    @staticmethod
    def _calc_rsi(prices, window=14):
        delta = prices.diff()
        gain = delta.where(delta > 0, 0).ewm(alpha=1/window, adjust=False).mean()
        loss = (-delta.where(delta < 0, 0)).ewm(alpha=1/window, adjust=False).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))

    @staticmethod
    def _calc_stoch_rsi(rsi_series, window=14):
        # Calculates where the current RSI is relative to its highest/lowest RSI over the window
        min_rsi = rsi_series.rolling(window=window).min()
        max_rsi = rsi_series.rolling(window=window).max()
        stoch_rsi = (rsi_series - min_rsi) / (max_rsi - min_rsi)
        return stoch_rsi

    @staticmethod
    def _calc_macd(prices):
        ema_12 = prices.ewm(span=12, adjust=False).mean()
        ema_26 = prices.ewm(span=26, adjust=False).mean()
        macd_line = ema_12 - ema_26
        macd_signal = macd_line.ewm(span=9, adjust=False).mean()
        return macd_line, macd_signal

    @staticmethod
    def _calc_bollinger(prices, window=20):
        sma = prices.rolling(window=window).mean()
        std = prices.rolling(window=window).std()
        return sma + (std * 2), sma - (std * 2)

    @staticmethod
    def _calc_atr(prices, window=14):
        true_range = prices.diff().abs()
        return true_range.rolling(window=window).mean()

    @staticmethod
    def _calc_roc(prices, window=21):
        # 21 trading days = 1 trading month of pure momentum
        return ((prices - prices.shift(window)) / prices.shift(window)) * 100

    @staticmethod
    def generate_signals(prices: pd.Series):
        # 1. Call the isolated math functions
        fast_ma = prices.rolling(window=50).mean()
        slow_ma = prices.rolling(window=200).mean()
        rsi = TechnicalScreener._calc_rsi(prices)
        stoch_rsi = TechnicalScreener._calc_stoch_rsi(rsi)
        macd_line, macd_signal = TechnicalScreener._calc_macd(prices)
        bb_upper, bb_lower = TechnicalScreener._calc_bollinger(prices)
        atr = TechnicalScreener._calc_atr(prices)
        roc = TechnicalScreener._calc_roc(prices)
        
        # 2. Extract today's values
        c_price = prices.iloc[-1]
        c_fast = fast_ma.iloc[-1]
        c_slow = slow_ma.iloc[-1]
        c_rsi = rsi.iloc[-1]
        c_stoch = stoch_rsi.iloc[-1]
        c_macd = macd_line.iloc[-1]
        c_macd_sig = macd_signal.iloc[-1]
        c_atr = atr.iloc[-1]
        c_roc = roc.iloc[-1]
        
        # 3. Master Logic Engine
        trend_bull = c_fast > c_slow
        
        if trend_bull and c_rsi < 30: signal = "STRONG BUY"
        elif trend_bull and c_rsi > 70: signal = "HOLD/CAUTION"
        elif trend_bull: signal = "BUY"
        elif not trend_bull and c_rsi > 70: signal = "STRONG SELL"
        elif not trend_bull and c_rsi < 30: signal = "WATCH"
        else: signal = "SELL"
            
        macd_status = "BULL" if c_macd > c_macd_sig else "BEAR"
        bb_status = "OVER" if c_price > bb_upper.iloc[-1] else "UNDER" if c_price < bb_lower.iloc[-1] else "INSIDE"
            
        return {
            "Price": round(c_price, 2),
            "Trend": "BULL" if trend_bull else "BEAR",
            "RSI": round(c_rsi, 1),
            "STOCH": round(c_stoch, 2) if not pd.isna(c_stoch) else 0.0,
            "MACD": macd_status,
            "Bollinger": bb_status,
            "ATR": f"{(c_atr / c_price) * 100:.2f}%",
            "ROC": f"{c_roc:+.1f}%",
            "Master Signal": signal
        }