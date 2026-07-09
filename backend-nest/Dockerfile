FROM node:22-slim

RUN apt-get update -y && apt-get install -y openssl procps && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 8001

CMD ["npm", "run", "dev"]
