import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { parseReceipt } from "@/lib/receipt-parser";
import { createRateLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { RECEIPT_LIMITS, type Plan } from "@/lib/feature-gates";

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

    // Check receipt scanning limits by plan
    const supabase = await createClient();
    if (supabase) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", auth.userId)
        .single();
      const userPlan = (profile?.plan || "free") as Plan;
      const limit = RECEIPT_LIMITS[userPlan];

      if (limit !== Infinity) {
        // Count scans this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from("expenses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", auth.userId)
          .eq("source", "receipt_scan")
          .gte("created_at", startOfMonth.toISOString());

        if ((count ?? 0) >= limit) {
          return NextResponse.json(
            { error: `Free plan allows ${limit} receipt scans per month. Upgrade to Pro for unlimited scanning.` },
            { status: 403 }
          );
        }
      }
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

    // Validate mime type to prevent abuse
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    const validatedMimeType = allowedMimeTypes.includes(mimeType) ? mimeType : 'image/jpeg';

    const result = await parseReceipt(imageBase64, validatedMimeType);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
