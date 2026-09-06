"""
core/data_pipeline.py
Institutional multi-currency data ingestion and alignment engine.
"""

import os
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import yfinance as yf


class MarketDataPipeline:
    def __init__(self, tickers: list[str], base_currency: str = "EUR", lookback_years: int = 2):
        self.tickers = list(set(tickers))
        self.base_currency = base_currency.upper()
        self.lookback_years = lookback_years
        self.cache_dir = "data_cache"
        os.makedirs(self.cache_dir, exist_ok=True)

    def _infer_currency(self, ticker: str) -> str:
        """Infer asset currency from exchange suffix."""
        if ticker.endswith(".AT"):
            return "EUR"
        elif ticker.endswith(".L"):
            return "GBP"
        elif ticker.endswith(".DE") or ticker.endswith(".PA") or ticker.endswith(".AS"):
            return "EUR"
        # Default US equities
        return "USD"

    def _get_fx_ticker(self, from_currency: str, to_currency: str) -> str:
        """Generate Yahoo Finance forex ticker."""
        return f"{from_currency}{to_currency}=X"

    def fetch_raw_data(self, target_days: int) -> tuple[pd.DataFrame, pd.DataFrame]:
        """Fetch asset prices and required FX exchange rates with dynamic intervals."""
        # Determine the correct interval and period based on frontend request
        if target_days == 1:
            interval = "1m"
            period = "5d"  # Fetch 5 days to ensure enough data points for TA math
        elif target_days == 7:
            interval = "1h"
            period = "1mo" # Fetch 1 month to ensure enough data points for TA math
        else:
            interval = "1d"
            period = "5y"  # Forces 5 years of daily data for anything else

        print(f"[DATA] Fetching {len(self.tickers)} assets (Interval: {interval}, Period: {period})...")
        
        raw_assets = yf.download(self.tickers, period=period, interval=interval, progress=False)['Close']
        
        if isinstance(raw_assets, pd.Series):
            raw_assets = raw_assets.to_frame(name=self.tickers[0])

        # Identify required FX pairs
        currencies = {t: self._infer_currency(t) for t in self.tickers}
        needed_fx = list(set(
            self._get_fx_ticker(curr, self.base_currency) 
            for curr in currencies.values() 
            if curr != self.base_currency
        ))

        raw_fx = pd.DataFrame()
        if needed_fx:
            print(f"[DATA] Fetching FX conversion rates: {needed_fx}...")
            raw_fx = yf.download(needed_fx, period=period, interval=interval, progress=False)['Close']
            if isinstance(raw_fx, pd.Series):
                raw_fx = raw_fx.to_frame(name=needed_fx[0])

        return raw_assets, raw_fx

    def normalize_to_base_currency(self, raw_assets: pd.DataFrame, raw_fx: pd.DataFrame) -> pd.DataFrame:
        """Align timestamps across exchanges and convert into base currency."""
        combined = pd.concat([raw_assets, raw_fx], axis=1)
        aligned = combined.ffill().dropna()
        normalized = pd.DataFrame(index=aligned.index)

        for ticker in self.tickers:
            asset_currency = self._infer_currency(ticker)
            if asset_currency == self.base_currency:
                normalized[ticker] = aligned[ticker]
            else:
                fx_pair = self._get_fx_ticker(asset_currency, self.base_currency)
                normalized[ticker] = aligned[ticker] * aligned[fx_pair]

        return normalized

    def load_clean_data(self, target_days: int, force_refresh: bool = False) -> pd.DataFrame:
        """Entrypoint: handles local caching per timeframe and conversion."""
        # Save separate cache files for 1m, 1h, and 1d data so they don't corrupt each other
        cache_file = os.path.join(self.cache_dir, f"normalized_{self.base_currency}_{target_days}d.csv")
        
        if not force_refresh and os.path.exists(cache_file):
            print(f"[CACHE] Loading cached data from {cache_file}")
            return pd.read_csv(cache_file, index_col=0, parse_dates=True)

        raw_assets, raw_fx = self.fetch_raw_data(target_days)
        normalized = self.normalize_to_base_currency(raw_assets, raw_fx)
        
        normalized.to_csv(cache_file)
        print(f"[SUCCESS] Normalized dataset saved ({normalized.shape[0]} rows, {normalized.shape[1]} assets).")
        return normalized