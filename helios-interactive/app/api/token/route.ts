import { NextRequest, NextResponse } from "next/server";

const DEFAULT_API_URL = "https://api.reactor.inc";

export async function POST(request: NextRequest) {
  const clientKey = request.headers.get("Reactor-API-Key");
  const { baseUrl } = await request.json().catch(() => ({ baseUrl: undefined }));

  const apiKey = clientKey || process.env.REACTOR_API_KEY;
  const apiUrl = baseUrl || process.env.NEXT_PUBLIC_COORDINATOR_URL || DEFAULT_API_URL;

  if (!apiKey) {
    return NextResponse.json(
      { error: "No API key provided and REACTOR_API_KEY is not configured" },
      { status: 400 },
    );
  }

  const response = await fetch(`${apiUrl}/tokens`, {
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
