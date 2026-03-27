import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.reactor.inc";

export async function POST(request: NextRequest) {
  const clientKey = request.headers.get("Reactor-API-Key");
  const apiKey = clientKey || process.env.REACTOR_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "No API key provided and REACTOR_API_KEY is not configured" },
      { status: 400 },
    );
  }

  const response = await fetch(`${API_URL}/tokens`, {
    method: "POST",
    headers: { "Reactor-API-Key": apiKey },
  });

  if (!response.ok) {
    const body = await response.text();
    return NextResponse.json(
      { error: `Token request failed: ${response.status} ${body}` },
      { status: response.status },
    );
  }

  const { jwt } = await response.json();
  return NextResponse.json({ jwt });
}
