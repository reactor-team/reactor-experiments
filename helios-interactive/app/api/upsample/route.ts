import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You expand short user prompts into detailed scene descriptions for a real-time video generation model. Write a single dense paragraph, strictly 80–120 words. You MUST finish the paragraph with a complete sentence — never cut off mid-sentence. Output only the expanded prompt, nothing else.

Follow this structure:
1. Set the scene — describe the environment, lighting, atmosphere, and mood in detail
2. Describe the main subject — their appearance, clothing, posture, expression, and what they are doing with specific physical actions
3. Add background elements — objects, surroundings, environmental details that ground the scene
4. End with a camera/shot description — e.g. "Medium close-up shot focusing on..." or "The camera follows... in a smooth tracking shot"

If a previous scene prompt is provided, focus primarily on the new user prompt but maintain some visual continuity — keep the same characters or setting if they naturally carry over, preserve the lighting style and color palette, but shift the action, mood, and framing to match the new prompt. The new prompt should feel like the next scene in the same story, not a completely unrelated shot.

Example: "A female astronaut in a full spacesuit, including an astronaut helmet, is running swiftly away from an unknown threat. She has a determined and focused expression on her face. The spacesuit is sleek, silver, and equipped with various gadgets and sensors. Her hair is visible under the helmet, flowing behind her as she runs. The background shows a desolate, rocky landscape with distant mountains and a dark, starry sky. The scene captures a medium shot of the woman mid-run, emphasizing her speed and urgency."`;

function buildUserMessage(
  prompt: string,
  previousPrompt?: string,
  imageBase64?: string,
) {
  const textPrompt = previousPrompt
    ? `The previous scene was: "${previousPrompt}"\n\nNow expand this next prompt. Focus on the new action and subject, but maintain visual continuity where it makes sense (same characters, setting, color palette): "${prompt}"`
    : prompt;

  const textPromptWithImage = previousPrompt
    ? `The previous scene was: "${previousPrompt}"\n\nThe attached image is a reference. Now expand this next prompt, maintaining visual continuity: "${prompt}"`
    : `The attached image is a reference — incorporate what you see into the scene description. Expand this prompt: "${prompt}"`;

  return { textPrompt, textPromptWithImage, hasImage: !!imageBase64 };
}

async function upsampleWithAnthropic(
  apiKey: string,
  prompt: string,
  previousPrompt?: string,
  imageBase64?: string,
): Promise<string> {
  const { textPrompt, textPromptWithImage, hasImage } = buildUserMessage(
    prompt,
    previousPrompt,
    imageBase64,
  );

  const userContent =
    hasImage && imageBase64
      ? [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
            },
          },
          { type: "text", text: textPromptWithImage },
        ]
      : textPrompt;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      `Anthropic API error: ${response.status} ${JSON.stringify(error)}`,
    );
  }

  const data = await response.json();
  return data.content?.[0]?.text?.trim() || "";
}

async function upsampleWithOpenAI(
  apiKey: string,
  prompt: string,
  previousPrompt?: string,
  imageBase64?: string,
): Promise<string> {
  const { textPrompt, textPromptWithImage, hasImage } = buildUserMessage(
    prompt,
    previousPrompt,
    imageBase64,
  );

  const userContent =
    hasImage && imageBase64
      ? [
          {
            type: "image_url",
            image_url: {
              url: imageBase64.startsWith("data:")
                ? imageBase64
                : `data:image/jpeg;base64,${imageBase64}`,
            },
          },
          { type: "text", text: textPromptWithImage },
        ]
      : [{ type: "text", text: textPrompt }];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5.4-nano",
      max_completion_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      `OpenAI API error: ${response.status} ${JSON.stringify(error)}`,
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, previousPrompt, imageBase64 } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!anthropicKey && !openaiKey) {
      return NextResponse.json(
        {
          error:
            "No LLM API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env.local",
        },
        { status: 500 },
      );
    }

    let upsampledPrompt: string;

    if (anthropicKey) {
      upsampledPrompt = await upsampleWithAnthropic(
        anthropicKey,
        prompt,
        previousPrompt,
        imageBase64,
      );
    } else {
      upsampledPrompt = await upsampleWithOpenAI(
        openaiKey!,
        prompt,
        previousPrompt,
        imageBase64,
      );
    }

    if (!upsampledPrompt) {
      return NextResponse.json(
        { error: "No response from LLM" },
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
