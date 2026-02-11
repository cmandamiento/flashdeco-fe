FROM node:22.6.0-alpine

WORKDIR /app

# Evita problemas con watchers en Docker (Next.js)
ENV CHOKIDAR_USEPOLLING=true

COPY package*.json ./
RUN npm i

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]