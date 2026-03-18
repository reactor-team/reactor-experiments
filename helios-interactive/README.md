# helios-interactive

A story-driven Next.js demo using the **Helios** model. Pick a narrative, then progress through sequential story beats — each follow-up prompt is scheduled into the running generation so the video transitions smoothly without resetting.

## What It Does

- Choose from pre-written stories (e.g. "King of the Jungle", "Rainy Evening") with multiple steps
- The first prompt starts a fresh generation via `set_prompt` + `start`
- Follow-up prompts use `schedule_prompt` at `currentChunk + 2` so transitions happen seamlessly while the video keeps generating
- Shows the current active prompt and your step progress through the story
- Type your own prompts to steer the generation manually at any point
- Reset to start over or pick a different story

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
