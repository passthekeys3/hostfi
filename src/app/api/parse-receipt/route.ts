import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { parseReceipt } from "@/lib/receipt-parser";
import { createRateLimiter } from "@/lib/rate-limit";

const isRateLimited = createRateLimiter('parse-receipt', 20, 60_000);

const MAX_PAYLOAD_SIZE = 5_242_880; // 5MB (receipts can be larger images)

export async function POST(request: NextRequest) {
  try {
    // Require authenticated user
    const auth = await authenticateRequest();
    if (!auth.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting by user
    if (isRateLimited(auth.userId)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Payload size check
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const body = await request.json();

    // Input validation
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { imageBase64, mimeType } = body as {
      imageBase64: string;
      mimeType: string;
    };

    if (!imageBase64) {
      return NextResponse.json(
        { error: "imageBase64 is required" },
        { status: 400 }
      );
    }

    const result = await parseReceipt(imageBase64, mimeType || "image/jpeg");
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
