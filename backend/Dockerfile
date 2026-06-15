FROM node:20-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose port (default 3001)
EXPOSE 3001

# Command to run the application
CMD ["node", "server.js"]
