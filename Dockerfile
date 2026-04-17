FROM node:18-alpine

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Default port (can be overridden with PORT env var)
ENV PORT=3005
EXPOSE 3005

CMD ["node", "src/server.js"]
