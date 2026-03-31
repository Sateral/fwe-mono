import { NextRequest, NextResponse } from "next/server";

/**
 * Instagram Basic Display API endpoint
 * Fetches recent media (reels and posts) from the configured Instagram account
 *
 * Required Environment Variables:
 * - INSTAGRAM_ACCESS_TOKEN: Long-lived user access token
 * - INSTAGRAM_USER_ID: Instagram user ID for the account
 *
 * Setup Instructions:
 * 1. Create Facebook App: https://developers.facebook.com/apps
 * 2. Add "Instagram Basic Display" product
 * 3. Configure OAuth redirect URIs
 * 4. Generate user access token (short-lived)
 * 5. Exchange for long-lived token (60 days): https://developers.facebook.com/docs/instagram-basic-display-api/guides/long-lived-access-tokens
 * 6. Add credentials to .env.local
 *
 * API Response Structure:
 * - id: Instagram media ID
 * - media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM"
 * - media_url: URL to the media file
 * - thumbnail_url: Thumbnail URL (for videos)
 * - permalink: Instagram post URL
 * - caption: Post caption
 * - timestamp: ISO 8601 timestamp
 */

const INSTAGRAM_API_BASE = "https://graph.instagram.com";
const CACHE_DURATION = 60 * 10; // 10 minutes in seconds

interface InstagramMedia {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
  timestamp: string;
}

interface InstagramApiResponse {
  data: InstagramMedia[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

interface ReelResponse {
  id: string;
  thumbnail: string;
  permalink: string;
  caption?: string;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  try {
    // Check for required environment variables
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const userId = process.env.INSTAGRAM_USER_ID;

    if (!accessToken || !userId) {
      console.error("Missing Instagram credentials in environment variables");
      return NextResponse.json(
        {
          error: "Instagram API not configured",
          message: "Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_USER_ID",
        },
        { status: 500 },
      );
    }

    // Get limit from query params (default to 6)
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "6"), 25); // Instagram API max is 25

    // Fetch media from Instagram Basic Display API
    const fields =
      "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp";
    const url = `${INSTAGRAM_API_BASE}/${userId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;

    const response = await fetch(url, {
      next: { revalidate: CACHE_DURATION },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Instagram API error:", errorData);

      // Handle specific error cases
      if (response.status === 401) {
        return NextResponse.json(
          {
            error: "Invalid access token",
            message:
              "Instagram access token is invalid or expired. Please refresh your token.",
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          error: "Failed to fetch Instagram media",
          message: errorData.error?.message || "Unknown error",
        },
        { status: response.status },
      );
    }

    const data: InstagramApiResponse = await response.json();

    // Transform Instagram API response to our expected format
    // Note: Instagram Basic Display API doesn't provide likes/comments count
    // Only Business/Creator accounts with Graph API can access engagement metrics
    const reels: ReelResponse[] = data.data.map((media) => ({
      id: media.id,
      thumbnail:
        media.media_type === "VIDEO"
          ? media.thumbnail_url || media.media_url
          : media.media_url,
      permalink: media.permalink,
      caption: media.caption,
      timestamp: media.timestamp,
    }));

    return NextResponse.json(
      { reels },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate`,
        },
      },
    );
  } catch (error) {
    console.error("Error fetching Instagram media:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
