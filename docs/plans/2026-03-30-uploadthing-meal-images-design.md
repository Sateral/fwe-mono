# UploadThing Meal Image Upload - Design Document

**Date:** 2026-03-30  
**Status:** Approved  
**Author:** OpenCode

## Overview

Add UploadThing integration to the CMS for meal image uploads. Each meal has at most one image. Admins can upload, replace, or remove images. Old images are deleted immediately when replaced to maintain data efficiency.

## Requirements

1. Each meal can have one image (at most)
2. Admin can upload a new image
3. Admin can replace an existing image (deletes old one immediately)
4. Admin can remove an image
5. Images should not accumulate - replaced/removed images are deleted from storage
6. Integration lives in CMS only (source of truth)
7. Web app displays images via stored URLs

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CMS (apps/cms)                          │
├─────────────────────────────────────────────────────────────┤
│  app/api/uploadthing/route.ts     <- UploadThing API route  │
│  lib/uploadthing.ts               <- FileRouter + UTApi     │
│  components/meal-image-upload.tsx <- Upload UI component    │
│  app/dashboard/menu/_components/meal-form.tsx (updated)     │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│  UploadThing Cloud Storage                                  │
│  - Images stored with file keys                             │
│  - UTApi.deleteFiles() for cleanup                          │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│  Database (Meal.imageUrl)                                   │
│  - Stores UploadThing URL                                   │
│  - Existing field, no schema change needed                  │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. FileRouter (`lib/uploadthing.ts`)

Server-side file router configuration:

- **Route:** `mealImage`
- **Max file size:** 4MB
- **File types:** image/\* (jpg, png, webp, gif)
- **Max count:** 1
- **Middleware:** Verify admin session via better-auth
- **onUploadComplete:** Return file URL to client

### 2. API Route (`app/api/uploadthing/route.ts`)

Standard UploadThing route handler exposing GET and POST endpoints.

### 3. Upload Component (`components/meal-image-upload.tsx`)

React component for the upload UI:

- Uses `@uploadthing/react` UploadDropzone
- Shows current image preview if exists
- "Remove" button to clear image
- Handles upload progress and errors
- Calls deletion action when replacing images

### 4. Server Actions (`lib/actions/meal-image.actions.ts`)

- `deleteMealImage(imageUrl: string)`: Extracts file key from URL, calls `UTApi.deleteFiles()`

### 5. Meal Form Integration

Update `app/dashboard/menu/_components/meal-form.tsx`:

- Add image upload section to "Basic Info" tab
- Connect to form state via `imageUrl` field
- Handle upload complete → update form state
- Handle remove → clear form state + delete from storage

### 6. Meal Service Update

Update `lib/services/meal.service.ts`:

- On meal deletion, delete associated image from UploadThing if exists

## Data Flow

### Upload New Image

1. User drops image in dropzone
2. UploadThing middleware verifies admin session
3. File uploads to UploadThing cloud
4. `onClientUploadComplete` receives URL
5. If meal had existing image → call `deleteMealImage(oldUrl)`
6. Update form state with new URL
7. User saves form → URL persisted to DB

### Replace Image

1. User uploads new image (same flow as above)
2. Old image URL is captured before form state update
3. Old image deleted from UploadThing via server action
4. New URL set in form state

### Remove Image

1. User clicks "Remove" button
2. Call `deleteMealImage(currentUrl)` server action
3. Clear form state imageUrl to null
4. User saves form → null persisted to DB

### Delete Meal

1. Meal service checks if meal has imageUrl
2. If exists → call `deleteMealImage(imageUrl)`
3. Delete meal from database

## Environment Variables

```env
# CMS .env
UPLOADTHING_TOKEN=<your-uploadthing-token>
```

## File Structure Changes

```
apps/cms/
├── app/
│   └── api/
│       └── uploadthing/
│           └── route.ts          # NEW - UploadThing API route
├── lib/
│   ├── uploadthing.ts            # NEW - FileRouter + UTApi export
│   └── actions/
│       └── meal-image.actions.ts # NEW - Server actions for deletion
├── components/
│   └── meal-image-upload.tsx     # NEW - Upload UI component
└── package.json                  # Add uploadthing dependencies
```

## Dependencies

Add to `apps/cms/package.json`:

```json
{
  "uploadthing": "^7.x",
  "@uploadthing/react": "^7.x"
}
```

## Security Considerations

1. **Authentication:** FileRouter middleware verifies better-auth admin session
2. **File Types:** Only image/\* allowed, prevents arbitrary file uploads
3. **File Size:** 4MB limit prevents abuse
4. **Authorization:** Only admins can access CMS upload functionality

## Error Handling

1. **Upload Failure:** Show toast error, don't update form state
2. **Delete Failure:** Log error, continue with form save (orphan file is acceptable edge case)
3. **Auth Failure:** UploadThingError thrown, upload blocked

## Testing Strategy

1. **Manual Testing:**
   - Upload new image to meal without image
   - Replace existing image (verify old image deleted)
   - Remove image from meal
   - Delete meal with image (verify image deleted)

2. **Verification:**
   - Check UploadThing dashboard for file count
   - Verify no orphan files after replace/delete operations

## Future Considerations

1. **Orphan Cleanup Cron:** If needed, add a scheduled job to clean up orphan files
2. **Image Optimization:** UploadThing provides image optimization options
3. **CDN Caching:** UploadThing URLs are CDN-backed by default
