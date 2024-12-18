FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lockb tsconfig.json ./

RUN bun install

COPY . .

EXPOSE 8079

CMD ["bun", "src/index.ts"]