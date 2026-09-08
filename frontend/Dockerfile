# /frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the React source code
COPY . .

EXPOSE 5173

# Start the Vite development server mapped to Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]