import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { refreshGoogleToken } from "@/lib/integrations/google";

/**
 * GET /api/integrations/google/access-token
 * Returns the user's current Google access token, refreshing if needed
 * Used by the Google Picker component on the client side
 */
export async function GET() {
  try {
    const auth = await authenticateRequest();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const user = { id: auth.userId };

    // Use service role to get the connection
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get the Google Sheets connection (both Sheets and Drive share the same OAuth tokens)
    const { data: connection, error: fetchError } = await supabaseAdmin
      .from("integration_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google_sheets")
      .eq("active", true)
      .single();

    // If no sheets connection, try drive
    let conn = connection;
    if (fetchError || !conn) {
      const { data: driveConn, error: driveError } = await supabaseAdmin
        .from("integration_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "google_drive")
        .eq("active", true)
        .single();
      
      if (driveError || !driveConn) {
        return NextResponse.json(
          { error: "No Google connection found" },
          { status: 404 }
        );
      }
      conn = driveConn;
    }

    let accessToken = conn.access_token;
    const tokenExpiresAt = conn.token_expires_at
      ? new Date(conn.token_expires_at).getTime()
      : 0;

    // Refresh token if expired, expiring within 5 minutes, or no expiry stored (always refresh to be safe)
    const shouldRefresh = !tokenExpiresAt || Date.now() > tokenExpiresAt - 300_000;
    if (shouldRefresh && conn.refresh_token) {
      try {
        const refreshed = await refreshGoogleToken(conn.refresh_token);
        accessToken = refreshed.access_token;

        // Update stored token
        const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
        
        // Update both connections (they share tokens)
        await Promise.all([
          supabaseAdmin
            .from("integration_connections")
            .update({
              access_token: refreshed.access_token,
              token_expires_at: newExpiresAt,
            })
            .eq("user_id", user.id)
            .eq("provider", "google_sheets"),
          supabaseAdmin
            .from("integration_connections")
            .update({
              access_token: refreshed.access_token,
              token_expires_at: newExpiresAt,
            })
            .eq("user_id", user.id)
            .eq("provider", "google_drive"),
        ]);
      } catch (err) {
        console.error("Token refresh failed:", err);
        return NextResponse.json(
          { error: "Token refresh failed. Please reconnect your Google account." },
          { status: 401 }
        );
      }
    }

    return NextResponse.json({ access_token: accessToken });
  } catch (err) {
    console.error("access-token error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
