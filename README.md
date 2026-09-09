# Mikrometoxos Assistant

A full-stack quantitative finance terminal built for technical screening, portfolio optimization, and historical backtesting. 

[![Live Application](https://img.shields.io/badge/Live_App-Vercel-black?style=for-the-badge&logo=vercel)](https://trading-engine-livid.vercel.app)
[![API Engine](https://img.shields.io/badge/API_Engine-Render-46E3B7?style=for-the-badge&logo=render)](https://trading-engine-zvhw.onrender.com)
[![Demo Video](https://img.shields.io/badge/Demo_Video-YouTube-FF0000?style=for-the-badge&logo=youtube)](https://youtu.be/Sk2v--9Y3jQ)

> **Note:** The backend API is hosted on Render's free tier, so the first request might take about 45-60 seconds to wake the server up from inactivity. For an immediate look at the UI and features, check out the [demo video](https://youtu.be/Sk2v--9Y3jQ).

## Features

* **Technical Screener:** Fetches live market data for US and Greek (ATHEX) equities via `yfinance`. Automatically applies technical overlays including EMAs, SMAs, and Bollinger Bands.
* **Portfolio Optimization:** Uses SciPy's Sequential Least Squares Programming (`SLSQP`) to calculate the Markowitz efficient frontier. It maximizes the expected Sharpe ratio while adhering to user-defined min/max weight constraints.
* **Backtesting Engine:** Runs historical out-of-sample simulations to validate asset allocations. Outputs core institutional risk metrics including Sortino ratio, Maximum Drawdown, and Conditional Value at Risk (CVaR).

## Tech Stack

* **Frontend:** React, Vite, Tailwind CSS, Axios
* **Backend:** Python, FastAPI, SciPy, NumPy, Pandas, yfinance
* **Deployment:** Vercel (Frontend CI/CD), Render (Backend container)

## Running Locally

To run this project on your local machine:

**1. Clone the repository**
```bash
git clone https://github.com/Sigkoudis/trading-engine.git
cd trading-engine
```
2. Start the Backend (in terminal 1)
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload
```

3. Start the Frontend (in terminal 2)
```bash
cd frontend
npm install
npm run dev
```

