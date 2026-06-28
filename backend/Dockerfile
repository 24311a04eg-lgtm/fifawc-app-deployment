FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json .
RUN npm ci --production
COPY . .
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3000
CMD ["node", "server.js"]