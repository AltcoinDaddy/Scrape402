FROM mcr.microsoft.com/playwright:v1.41.0-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the dynamic port
EXPOSE 4021

# Start the server
CMD ["npx", "tsx", "server/index.ts"]
