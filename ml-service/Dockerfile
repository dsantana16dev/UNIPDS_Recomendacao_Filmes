FROM node:22-slim

WORKDIR /app

# tfjs-node compila binários nativos — precisa de build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
