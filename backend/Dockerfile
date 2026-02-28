# Use Node.js 20 LTS version
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Fix permissions for node_modules binaries
RUN chmod -R +x node_modules/.bin

# Build the TypeScript application
RUN npx tsc

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
