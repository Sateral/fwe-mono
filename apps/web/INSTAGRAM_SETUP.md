# Instagram Integration Setup Guide

This guide walks you through setting up Instagram Basic Display API for the FWE landing page Instagram Showcase.

## Overview

The Instagram Showcase section on the landing page displays the latest 6 posts from the @freewilleats Instagram account. It uses the Instagram Basic Display API to fetch real-time content.

## Prerequisites

- A Facebook Developer account
- Access to the @freewilleats Instagram account
- The Instagram account must be a personal account (not a business account)

## Setup Steps

### 1. Create a Facebook App

1. Go to https://developers.facebook.com/apps
2. Click "Create App"
3. Choose "Consumer" as the app type
4. Fill in app details:
   - **App Name**: FWE Instagram Feed (or any name)
   - **App Contact Email**: Your email
5. Click "Create App"

### 2. Add Instagram Basic Display Product

1. In your app dashboard, find "Instagram Basic Display" in the products list
2. Click "Set Up"
3. Click "Create New App" in the Instagram Basic Display panel
4. Accept the terms

### 3. Configure Basic Display Settings

1. Go to **Basic Display** section
2. Add OAuth Redirect URIs:
   - **Development**: `https://localhost:3000/`
   - **Production**: `https://yourdomain.com/`
3. Add Deauthorize Callback URL: `https://yourdomain.com/`
4. Add Data Deletion Request URL: `https://yourdomain.com/`
5. Click "Save Changes"

### 4. Add Instagram Tester

1. Scroll to "User Token Generator"
2. Click "Add or Remove Instagram Testers"
3. This opens Instagram Settings in a new tab
4. Log in to the @freewilleats Instagram account
5. Go to Settings → Apps and Websites → Tester Invites
6. Accept the tester invite from your Facebook app

### 5. Generate Access Token

1. Back in the Facebook Developer dashboard, refresh the page
2. In "User Token Generator", click "Generate Token" next to the Instagram account
3. Log in to Instagram if prompted and authorize the app
4. Copy the **Access Token** (short-lived, valid for 1 hour)
5. Copy the **User ID** shown

### 6. Exchange for Long-Lived Token

Short-lived tokens expire in 1 hour. Exchange it for a long-lived token (valid for 60 days):

```bash
curl -X GET \
  "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret={your-app-secret}&access_token={short-lived-token}"
```

**Where:**

- `{your-app-secret}`: Found in **App Settings → Basic** in the Facebook Developer dashboard
- `{short-lived-token}`: The token you just generated

**Response:**

```json
{
  "access_token": "IGQWRPabc123...",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

Copy the new `access_token` - this is your long-lived token.

### 7. Add to Environment Variables

1. Copy `apps/web/.env.example` to `apps/web/.env.local`
2. Add the credentials:

```env
INSTAGRAM_ACCESS_TOKEN=IGQWRPabc123...
INSTAGRAM_USER_ID=17841405793
```

### 8. Test the Integration

1. Start the development server: `bun run dev --filter=web`
2. Visit http://localhost:3000
3. Scroll to the Instagram Showcase section
4. Verify that 6 real posts from @freewilleats are displayed
5. Check browser console for any errors

## Token Refresh

Long-lived tokens expire after 60 days. You have two options:

### Option A: Manual Refresh (Recommended for testing)

Before expiration, refresh the token:

```bash
curl -X GET \
  "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token={current-long-lived-token}"
```

This extends the token for another 60 days.

### Option B: Automated Refresh (Production)

Set up a cron job or scheduled task to refresh the token every 30 days:

1. Create an API route at `apps/web/app/api/cron/refresh-instagram-token/route.ts`
2. Use Vercel Cron or similar to call it monthly
3. Store the new token in your environment variables or a secure database

## Troubleshooting

### "Invalid access token" error

- Token may have expired (check if it's been 60+ days)
- Refresh the token using the refresh endpoint above
- Or generate a new token following steps 5-6

### "Instagram API not configured" error

- Check that environment variables are set in `.env.local`
- Restart the development server after adding variables
- Verify variable names match exactly: `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_USER_ID`

### No posts showing / Empty response

- Check that the Instagram account has public posts
- Verify the User ID is correct
- Check browser console and server logs for API errors
- Try fetching directly: `https://graph.instagram.com/{user-id}/media?fields=id,media_type,media_url,thumbnail_url&access_token={token}`

### Posts show but images are broken

- Instagram media URLs expire after some time
- The API route has caching (10 min) - images should refresh periodically
- Check if the Instagram account has privacy restrictions

## API Limitations

- **Instagram Basic Display API** only provides basic media data (no likes/comments count)
- To get engagement metrics, you'd need to upgrade to **Instagram Graph API** which requires a Business/Creator account
- Rate limit: 200 requests per hour per user
- Long-lived tokens expire every 60 days and require manual refresh

## Files Modified

- `apps/web/.env.example` - Added Instagram environment variables
- `apps/web/app/api/instagram/reels/route.ts` - API route to fetch Instagram media
- `apps/web/components/landing/instagram-showcase.tsx` - Updated to fetch real data
- `apps/web/INSTAGRAM_SETUP.md` - This setup guide

## Next Steps

- Add the real credentials to `.env.local` (see `.env.example`)
- Test the integration locally
- Deploy to production (Vercel will use environment variables from the dashboard)
- Set up token refresh automation before the 60-day expiration

## Resources

- [Instagram Basic Display API Documentation](https://developers.facebook.com/docs/instagram-basic-display-api)
- [Long-Lived Access Tokens](https://developers.facebook.com/docs/instagram-basic-display-api/guides/long-lived-access-tokens)
- [API Reference](https://developers.facebook.com/docs/instagram-basic-display-api/reference)
