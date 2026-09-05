import pandas as pd
import numpy as np

def optimize_portfolio():
    print("Loading normalized market data...")
    df = pd.read_csv("historical_prices.csv", index_col="Date", parse_dates=True)
    daily_returns = df.pct_change().dropna()
    
    if len(daily_returns) == 0:
        print("ERROR: Your dataset is empty! Mismatched holidays wiped it out.")
        return
        
    num_simulations = 5000
    best_sharpe = -100 
    best_weights = []   
    best_return = 0
    best_vol = 0
    risk_free_rate = 0.03 
    
    # THE NEW RULE: No single stock can hold more than 40% of your money
    max_weight = 0.40 
    
    cov_matrix = daily_returns.cov() * 252
    
    print(f"\n--- Running {num_simulations} Simulations (Max {max_weight*100:.0f}% per asset) ---")
    
    for _ in range(num_simulations):
        # 1. The Bouncer: Keep rolling the dice until all weights are under 40%
        valid = False
        while not valid:
            weights = np.random.random(len(df.columns))
            weights /= np.sum(weights)
            
            # If NONE of the generated weights are greater than 0.40, approve it!
            if not np.any(weights > max_weight):
                valid = True
        
        # 2. Standard Math
        annual_return = np.sum(daily_returns.mean() * weights) * 252
        annual_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
        
        sharpe_ratio = (annual_return - risk_free_rate) / annual_volatility
        
        # 3. High Score Check
        if not np.isnan(sharpe_ratio) and sharpe_ratio > best_sharpe:
            best_sharpe = sharpe_ratio
            best_weights = weights
            best_return = annual_return
            best_vol = annual_volatility
            
    print("\n🏆 BALANCED OPTIMAL PORTFOLIO FOUND 🏆")
    
    for i in range(len(df.columns)):
        print(f"Optimal {df.columns[i]} Weight: {best_weights[i] * 100:.2f}%")
            
    print(f"--------------------------------")
    print(f"Expected Annual Return: {best_return * 100:.2f}%")
    print(f"Annual Volatility (Risk): {best_vol * 100:.2f}%")
    print(f"Max Sharpe Ratio: {best_sharpe:.2f}")

if __name__ == "__main__":
    optimize_portfolio()