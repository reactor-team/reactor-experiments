# LiveCore Example

A simple demo application showcasing the Reactor JS SDK with the **livecore** video generation model.

## What This Example Does

This Next.js app demonstrates how to:

- Connect to Reactor's livecore model for AI video generation
- Send prompts at specific timestamps to guide video creation
- Display real-time video output with `ReactorView`
- Track generation progress and manage model state

## Getting Started

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Set Up Your API Keys

Copy the example environment file and add your API keys:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add:

- `NEXT_PUBLIC_REACTOR_API_KEY` - Your Reactor API key

### 3. Run the Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## How to Use

1. **Text Input**: Enter a prompt in the text field and click "Send"
2. **Voice Input**: Click the microphone button to record your prompt, click again to stop and transcribe
3. Watch as the livecore model generates video based on your prompts
4. Add additional prompts to guide the video generation in real-time
5. Track the current frame position to see where you are in the generation

## About the LiveCore Model

LiveCore is a frame-level autoregressive framework for real-time and interactive long video generation.

## Learn More

- [Reactor Website](https://reactor.inc) - Learn more about Reactor and our platform
- [Reactor Documentation](https://docs.reactor.inc) - Learn about Reactor's AI models and SDK

## Support

For questions or issues, contact our support team at [team@reactor.inc](mailto:team@reactor.inc).
