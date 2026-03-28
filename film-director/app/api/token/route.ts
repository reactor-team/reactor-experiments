import { NextResponse } from "next/server";

const API_URL = "https://api.reactor.inc";

export async function POST() {
  const apiKey = process.env.REACTOR_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "REACTOR_API_KEY is not configured" },
      { status: 500 },
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
