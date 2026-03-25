import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You expand short user prompts into detailed scene descriptions for a real-time video generation model. Write a single dense paragraph, strictly 60–100 words. You MUST finish the paragraph with a complete sentence — never cut off mid-sentence. Output only the expanded prompt, nothing else.

Follow this structure:
1. Set the scene — describe the environment, lighting, atmosphere, and mood in detail
2. Describe the main subject — their appearance, clothing, posture, expression, and what they are doing with specific physical actions
3. Add background elements — objects, surroundings, environmental details that ground the scene
4. End with a camera/shot description — e.g. "Medium close-up shot focusing on..." or "The camera follows... in a smooth tracking shot"

If a previous scene prompt is provided, focus primarily on the new user prompt but maintain some visual continuity — keep the same characters or setting if they naturally carry over, preserve the lighting style and color palette, but shift the action, mood, and framing to match the new prompt. The new prompt should feel like the next scene in the same story, not a completely unrelated shot.

Example: "A female astronaut in a full spacesuit, including an astronaut helmet, is running swiftly away from an unknown threat. She has a determined and focused expression on her face. The spacesuit is sleek, silver, and equipped with various gadgets and sensors. Her hair is visible under the helmet, flowing behind her as she runs. The background shows a desolate, rocky landscape with distant mountains and a dark, starry sky. The scene captures a medium shot of the woman mid-run, emphasizing her speed and urgency."`;

export async function POST(request: NextRequest) {
  try {
    const { prompt, previousPrompt, imageBase64, anthropicApiKey } =
      await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    if (!anthropicApiKey || typeof anthropicApiKey !== "string") {
      return NextResponse.json(
        { error: "Anthropic API key is required" },
        { status: 400 },
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: imageBase64
              ? [
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: "image/jpeg",
                      data: imageBase64.replace(
                        /^data:image\/\w+;base64,/,
                        "",
                      ),
                    },
                  },
                  {
                    type: "text",
                    text: previousPrompt
                      ? `The previous scene was: "${previousPrompt}"\n\nThe attached image is a reference. Now expand this next prompt, maintaining visual continuity: "${prompt}"`
                      : `The attached image is a reference — incorporate what you see into the scene description. Expand this prompt: "${prompt}"`,
                  },
                ]
              : previousPrompt
                ? `The previous scene was: "${previousPrompt}"\n\nNow expand this next prompt. Focus on the new action and subject, but maintain visual continuity where it makes sense (same characters, setting, color palette): "${prompt}"`
                : prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      console.error("[upsample] Anthropic API error:", JSON.stringify(error));
      return NextResponse.json(
        { error: "Failed to upsample prompt" },
        { status: response.status },
      );
    }

    const data = await response.json();
    const upsampledPrompt = data.content?.[0]?.text?.trim();

    if (!upsampledPrompt) {
      return NextResponse.json(
        { error: "No response from Anthropic" },
        { status: 500 },
      );
    }

    return NextResponse.json({ upsampledPrompt });
  } catch (error) {
    console.error("[upsample] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
