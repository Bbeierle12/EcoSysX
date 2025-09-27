# Use Node.js official image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Install serve to run the built app
RUN npm install -g serve

# Expose port 7860 (required for Hugging Face Spaces)
EXPOSE 7860

# Start the app
CMD ["serve", "-s", "dist", "-l", "7860"]