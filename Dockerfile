# /Dockerfile (Root)
FROM python:3.10-slim

WORKDIR /app

# Install standard dependencies 
RUN pip install fastapi uvicorn pandas numpy yfinance scipy scikit-learn

# Copy your Python code into the container
COPY . /app

EXPOSE 8000

# Start the FastAPI engine
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]