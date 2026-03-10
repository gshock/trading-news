# node:20-slim is Debian Bookworm — officially supported by Playwright.
# Alpine is NOT supported by Playwright (no apt-get, fallback fails).
FROM node:20-slim

# Suppress debconf warnings during apt-get
ENV DEBIAN_FRONTEND=noninteractive

# Install apt-utils first in its own step so debconf is fully functional
# before any subsequent packages run their post-install configuration.
# stderr is suppressed here because the "delaying package configuration"
# warning is expected and harmless during apt-utils' own installation.
RUN apt-get update && \
    apt-get install -y --no-install-recommends apt-utils 2>/dev/null && \
    rm -rf /var/lib/apt/lists/*

# Install system libraries required by:
#   - canvas (Cairo/Pango) for chartjs-node-canvas chart rendering
#   - Playwright (Chromium) for web scraping
#   - tzdata for node-cron timezone support (node:slim has no timezone data)
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    fontconfig \
    fonts-liberation \
    python3 \
    make \
    g++ \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Set timezone so node-cron can resolve America/New_York
ENV TZ=America/New_York

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Update npm to latest, then install app dependencies.
# --loglevel=error suppresses deprecation notices from transitive deps
# (e.g. prebuild-install@7 inside the canvas package) without hiding real errors.
RUN npm install -g npm@latest
RUN npm install --loglevel=error
RUN npx playwright install --with-deps chromium

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
