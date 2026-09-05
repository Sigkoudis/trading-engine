import yfinance as yf
import pandas as pd

def fetch_market_data():
    print("Fetching data for ETE, Allwyn (ALWN), ELPE, and TTWO...")
    
    # Updated OPAP to its new official ticker: ALWN.AT
    tickers = ["ETE.AT", "ALWN.AT", "ELPE.AT", "TTWO", "USDEUR=X"] 
    
    data = yf.download(tickers, period="1y", interval="1d", threads=False)
    closing_prices = data['Close']
    
    # Forward fill holiday gaps safely, then drop initial NaN rows
    clean_data = closing_prices.ffill().dropna().copy()
    
    # Convert TTWO (USD) to Euros
    clean_data['TTWO_EUR'] = clean_data['TTWO'] * clean_data['USDEUR=X']
    
    # Keep only the final Euro columns
    final_data = clean_data[['ETE.AT', 'ALWN.AT', 'ELPE.AT', 'TTWO_EUR']]
    
    print("\n--- Last 5 Rows (100% in Euros) ---")
    print(final_data.tail())
    
    final_data.to_csv("historical_prices.csv")
    print("\n[SUCCESS] New 4-asset portfolio saved!")

if __name__ == "__main__":
    fetch_market_data()