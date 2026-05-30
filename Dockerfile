FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package manifests and install all deps (including dev) so we can run `prisma generate`
COPY package*.json ./
RUN npm ci

# Copy source (including prisma schema) so generation can run
COPY . .

# Generate Prisma client, then remove devDependencies to keep image small
RUN npx prisma generate && npm prune --production

# Default port (can be overridden with PORT env var)
ENV PORT=3005
EXPOSE 3005

CMD ["node", "src/server.js"]
