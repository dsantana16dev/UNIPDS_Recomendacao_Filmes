FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173

# Servidor de desenvolvimento Vite (host 0.0.0.0 via vite.config.ts)
CMD ["npm", "run", "dev"]
