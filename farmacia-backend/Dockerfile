FROM node:20.18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar el código fuente y los archivos necesarios en la raíz
COPY src/ ./src/
COPY openapi.yaml ./

EXPOSE 3001

CMD ["node", "src/server.js"]