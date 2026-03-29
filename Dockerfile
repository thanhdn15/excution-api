FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    nodejs \
    golang-go \
    php-cli \
  && rm -rf /var/lib/apt/lists/*

RUN go version && php -v && node -v

WORKDIR /app
COPY package.json server.js ./

EXPOSE 8787
CMD ["node", "server.js"]
