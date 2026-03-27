# helios-interactive

A story-driven Next.js demo using the **Helios** model for real-time interactive video generation. Pick a narrative or start from a reference image, then steer the video with follow-up prompts, all scheduled seamlessly without resetting.

## What It Does

- **Story presets**: choose from multi-step stories ("King of the Jungle", "Rainy Evening") and progress through sequential beats
- **Image-to-video**: start from example reference images (Village Puppy, Mars Explorer) or upload your own
- **Interactive prompts**: type custom prompts at any point to add to the running scene
- **Prompt enhancement**: custom prompts are automatically enhanced using OpenAI or Anthropic (configurable) for richer scene descriptions
- **Smooth transitions**: follow-up prompts use `schedule_prompt` so the video transitions without resetting
- **Side-by-side layout**: controls on the left, full video on the right (stacks on mobile)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up your environment

```bash
cp .env.example .env.local
```

Add your keys to `.env.local`:

```
REACTOR_API_KEY=your_reactor_api_key

# Prompt enhancement (set one or both)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Hit Connect and pick a story or image to start generating.

## Learn More

- [Reactor Docs](https://docs.reactor.inc/overview)
- [Discord](https://discord.gg/xSbBWECQRk): reach out if you have questions or run into issues
