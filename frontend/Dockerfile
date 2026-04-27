FROM node:20-slim

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .

ENV VITE_BIND_HOST=0.0.0.0
EXPOSE 5173
# Vite seul : l’API est le service backend (pas dev-api.mjs du poste dev).
CMD ["npm", "run", "dev:vite"]
