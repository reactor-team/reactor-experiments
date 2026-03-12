# helios

A minimal Next.js demo showing how to use the Reactor JS SDK with the **Helios** model for text-to-video generation.

## What It Does

- Connects to the Helios model and streams real-time video output via `ReactorView`
- Pick from preset scene prompts or type your own to generate video
- Each new prompt resets the current generation and starts fresh
- Shows a live chunk counter to track generation progress
- Reset generation at any time

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Paste your API key in the connection panel and hit Connect.

## Learn More

- [Reactor Docs](https://docs.reactor.inc/overview)
- [Discord](https://discord.gg/xSbBWECQRk) — reach out if you have questions or run into issues
