import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * POST /api/integrations/google/update-connection
 * Updates the metadata for a user's Google connection (Sheets or Drive)
 * Used when user picks a different spreadsheet or folder via Google Picker
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, metadata } = body as {
      provider: "google_sheets" | "google_drive";
      metadata: Record<string, unknown>;
    };

    if (!provider || !metadata) {
      return NextResponse.json(
        { error: "Missing provider or metadata" },
        { status: 400 }
      );
    }

    if (provider !== "google_sheets" && provider !== "google_drive") {
      return NextResponse.json(
        { error: "Invalid provider. Must be google_sheets or google_drive" },
        { status: 400 }
      );
    }

    // Get user from session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create client with user's session to get user ID
    const cookieStore = await cookies();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use service role to update the connection
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get existing connection
    const { data: existingConnection, error: fetchError } = await supabaseAdmin
      .from("integration_connections")
      .select("metadata")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("active", true)
      .single();

    if (fetchError || !existingConnection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    // Merge new metadata with existing
    const existingMetadata = (existingConnection.metadata || {}) as Record<string, unknown>;
    const newMetadata = { ...existingMetadata, ...metadata };

    // Update the connection
    const { error: updateError } = await supabaseAdmin
      .from("integration_connections")
      .update({ metadata: newMetadata })
      .eq("user_id", user.id)
      .eq("provider", provider);

    if (updateError) {
      console.error("Error updating connection:", updateError);
      return NextResponse.json(
        { error: "Failed to update connection" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, metadata: newMetadata });
  } catch (err) {
    console.error("update-connection error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
