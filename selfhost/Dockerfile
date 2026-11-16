# RH Desk: one-container, single-admin, locally hosted edition.
FROM node:22-alpine AS builder
WORKDIR /app
COPY people-desk/package.json people-desk/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY people-desk/ ./
ENV NEXT_PUBLIC_RH_DESK_REMOTE=1
ENV NEXT_PUBLIC_RH_DESK_STORAGE=local-server
RUN npm run build
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:22-alpine
ENV NODE_ENV=production
ENV NEXT_PUBLIC_RH_DESK_REMOTE=1
ENV NEXT_PUBLIC_RH_DESK_STORAGE=local-server
WORKDIR /app
COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/next.config.ts ./next.config.ts
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["npm", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
