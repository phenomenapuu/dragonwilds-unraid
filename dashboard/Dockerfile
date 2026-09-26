FROM node:22-alpine
# No npm dependencies: only Node's standard library and busybox tar.
WORKDIR /app
COPY app/ /app/
RUN chmod -R a+rX /app
USER node
CMD ["node", "/app/web.js"]
