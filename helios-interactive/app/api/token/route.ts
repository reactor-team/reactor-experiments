import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.REACTOR_API_KEY;
  const apiUrl = process.env.NEXT_PUBLIC_COORDINATOR_URL || "https://api.reactor.inc";

  if (!apiKey) {
    return NextResponse.json(
      { error: "REACTOR_API_KEY is not configured" },
      { status: 404 },
    );
  }

  const response = await fetch(`${apiUrl}/tokens`, {
    method: "GET",
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
