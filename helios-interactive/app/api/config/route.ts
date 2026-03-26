import { NextResponse } from "next/server";

export async function GET() {
  const reactorKey = process.env.REACTOR_API_KEY || "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY || "";
  const openaiKey = process.env.OPENAI_API_KEY || "";

  return NextResponse.json({
    hasReactorKey: reactorKey.startsWith("rk_"),
    hasEnhancement:
      anthropicKey.startsWith("sk-ant-") || openaiKey.startsWith("sk-"),
  });
}
