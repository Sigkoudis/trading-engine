import yfinance as yf
import pandas as pd

def fetch_market_data():
    print("Fetching 1 year of daily data for AAPL (US) and ETE.AT (Greece)...")
    
    # Define our target stocks. 
    # .AT is the suffix Yahoo uses for the Athens Stock Exchange.
    tickers = ["AAPL", "ETE.AT"] 
    
    # Download the data
    data = yf.download(tickers, period="1y", interval="1d", threads=False)    
    # We only care about the daily 'Close' prices
    closing_prices = data['Close']
    
    # Remove days with missing data (like US holidays vs Greek holidays)
    clean_data = closing_prices.dropna()
    
    print("\n--- First 5 Rows of Cleaned Data ---")
    print(clean_data.head())
    
    # Save the output locally
    clean_data.to_csv("historical_prices.csv")
    print("\n[SUCCESS] Data saved to historical_prices.csv!")

if __name__ == "__main__":
    fetch_market_data()