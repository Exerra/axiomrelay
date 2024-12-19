# AxiomRelay

> A modular ActivityPub relay with a focus on user safety and message quality standards.

## Installation

The only officially supported installation method is Docker Compose. Everything else is at your own discretion.

The official build image does not include a reverse proxy. One is **necessary** for TLS/SSL encryption and for the relay to run without issues. This is left to you. Bring your own reverse proxy.

### Docker Compose

First, create a directory and copy relevant files into it.

```sh
mkdir axiomrelay
cd axiomrelay
curl "https://github.com/Exerra/axiomrelay/raw/refs/heads/main/docker-compose.yml" -o docker-compose.yml
curl "https://github.com/Exerra/axiomrelay/raw/refs/heads/main/.env.example" -o .env
```

Make sure to open .env with your editor of choice and change the variables there.

It is highly advised to create a Telegram bot for managing the relay, as currently that is the only way of managing it. You can create one by messaging [@BotFather](https://t.me/botfather) on Telegram.

## Modules

Modules are placed in the `modules` directory. Docs and official modules are coming soon.

## Known issues

- Currently Pleroma/Akkoma instances are not officially supported.
- No multi arch docker images.