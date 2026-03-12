import { NextRequest, NextResponse } from "next/server";
import { MOVEMENT_SYSTEM_PROMPT } from "@/lib/movements";

export async function POST(request: NextRequest) {
  try {
    const { prompt, instruction } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (!instruction || typeof instruction !== "string") {
      return NextResponse.json(
        { error: "Movement instruction is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const userMessage = `Scene description:\n"${prompt}"\n\nCamera movement instruction:\n${instruction}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: MOVEMENT_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[apply-movement] OpenAI API error:", error);
      return NextResponse.json(
        { error: "Failed to apply movement" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim();

    if (!result) {
      return NextResponse.json(
        { error: "No response from OpenAI" },
        { status: 500 }
      );
    }

    return NextResponse.json({ enhancedPrompt: result });
  } catch (error) {
    console.error("[apply-movement] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
