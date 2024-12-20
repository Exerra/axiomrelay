FROM oven/bun:latest
LABEL org.opencontainers.image.source="https://github.com/Exerra/axiomrelay"

WORKDIR /app

COPY package.json bun.lockb tsconfig.json ./

RUN bun install

COPY . .

EXPOSE 8079

CMD ["bun", "src/index.ts"]