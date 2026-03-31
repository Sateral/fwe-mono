# UploadThing Meal Image Upload - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add UploadThing integration to the CMS for meal image uploads with immediate deletion of replaced images.

**Architecture:** UploadThing FileRouter in CMS with admin auth middleware, React upload component integrated into meal form, server action for image deletion via UTApi.

**Tech Stack:** UploadThing v7, @uploadthing/react, Next.js 16 App Router, better-auth, React Hook Form

---

## Task 1: Install UploadThing Dependencies

**Files:**

- Modify: `apps/cms/package.json`

**Step 1: Add dependencies**

```bash
cd apps/cms && bun add uploadthing @uploadthing/react
```

**Step 2: Verify installation**

Run: `bun install`
Expected: Dependencies installed successfully

**Step 3: Commit**

```bash
git add apps/cms/package.json bun.lock
git commit -m "chore(cms): add uploadthing dependencies"
```

---

## Task 2: Create UploadThing FileRouter

**Files:**

- Create: `apps/cms/lib/uploadthing.ts`

**Step 1: Create the FileRouter with auth middleware**

```typescript
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError, UTApi } from "uploadthing/server";
import { headers } from "next/headers";
import { Role } from "@fwe/db";
import { auth } from "@/lib/auth";

const f = createUploadthing();

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== Role.ADMIN) {
    throw new UploadThingError("Unauthorized: Admin access required");
  }

  return session;
}

export const uploadRouter = {
  mealImage: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const session = await requireAdmin();
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.ufsUrl);
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;

// Export UTApi instance for server-side file management
export const utapi = new UTApi();
```

**Step 2: Commit**

```bash
git add apps/cms/lib/uploadthing.ts
git commit -m "feat(cms): add UploadThing FileRouter with admin auth"
```

---

## Task 3: Create UploadThing API Route

**Files:**

- Create: `apps/cms/app/api/uploadthing/route.ts`

**Step 1: Create the route handler**

```typescript
import { createRouteHandler } from "uploadthing/next";
import { uploadRouter } from "@/lib/uploadthing";

export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
});
```

**Step 2: Commit**

```bash
git add apps/cms/app/api/uploadthing/route.ts
git commit -m "feat(cms): add UploadThing API route handler"
```

---

## Task 4: Create Server Action for Image Deletion

**Files:**

- Create: `apps/cms/lib/actions/meal-image.actions.ts`

**Step 1: Create the deletion server action**

```typescript
"use server";

import { Role } from "@fwe/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { utapi } from "@/lib/uploadthing";

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized: Admin access required");
  }

  return session;
}

/**
 * Extracts the file key from an UploadThing URL.
 * URLs are typically in format: https://utfs.io/f/{fileKey}
 */
function extractFileKey(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    // The file key is typically the last part after /f/
    const fIndex = pathParts.indexOf("f");
    if (fIndex !== -1 && pathParts[fIndex + 1]) {
      return pathParts[fIndex + 1];
    }
    // Fallback: just use the last path segment
    return pathParts[pathParts.length - 1] || null;
  } catch {
    return null;
  }
}

/**
 * Deletes an image from UploadThing storage.
 * Call this when replacing or removing a meal image.
 */
export async function deleteMealImage(
  imageUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  if (!imageUrl) {
    return { success: false, error: "No image URL provided" };
  }

  const fileKey = extractFileKey(imageUrl);
  if (!fileKey) {
    console.error("Could not extract file key from URL:", imageUrl);
    return { success: false, error: "Invalid image URL format" };
  }

  try {
    await utapi.deleteFiles(fileKey);
    console.log("Deleted image from UploadThing:", fileKey);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete image from UploadThing:", error);
    // Don't fail the operation - orphan files are acceptable edge case
    return { success: false, error: "Failed to delete image" };
  }
}
```

**Step 2: Commit**

```bash
git add apps/cms/lib/actions/meal-image.actions.ts
git commit -m "feat(cms): add server action for meal image deletion"
```

---

## Task 5: Create Meal Image Upload Component

**Files:**

- Create: `apps/cms/components/meal-image-upload.tsx`

**Step 1: Create the upload component**

```tsx
"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { IconUpload, IconTrash, IconLoader2 } from "@tabler/icons-react";
import { generateReactHelpers } from "@uploadthing/react";
import { toast } from "sonner";

import type { UploadRouter } from "@/lib/uploadthing";
import { deleteMealImage } from "@/lib/actions/meal-image.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const { useUploadThing } = generateReactHelpers<UploadRouter>();

interface MealImageUploadProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export function MealImageUpload({
  value,
  onChange,
  disabled,
}: MealImageUploadProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const { startUpload, isUploading } = useUploadThing("mealImage", {
    onClientUploadComplete: async (res) => {
      if (res?.[0]?.ufsUrl) {
        // Delete old image if exists
        if (value) {
          const deleteResult = await deleteMealImage(value);
          if (!deleteResult.success) {
            console.warn("Failed to delete old image:", deleteResult.error);
          }
        }
        onChange(res[0].ufsUrl);
        toast.success("Image uploaded successfully");
      }
    },
    onUploadError: (error) => {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload image");
    },
  });

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      startUpload([file]);
    },
    [startUpload],
  );

  const handleRemove = async () => {
    if (!value) return;

    setIsDeleting(true);
    try {
      const result = await deleteMealImage(value);
      if (!result.success) {
        console.warn("Failed to delete image:", result.error);
      }
      onChange(null);
      toast.success("Image removed");
    } catch (error) {
      console.error("Error removing image:", error);
      toast.error("Failed to remove image");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const isLoading = isUploading || isDeleting;

  if (value) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0 relative">
          <div className="relative aspect-video w-full">
            <Image
              src={value}
              alt="Meal image"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>
          <div className="absolute bottom-2 right-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement;
                  handleFileSelect(target.files);
                };
                input.click();
              }}
              disabled={disabled || isLoading}
            >
              {isUploading ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconUpload className="h-4 w-4" />
              )}
              <span className="ml-2">Replace</span>
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || isLoading}
            >
              {isDeleting ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconTrash className="h-4 w-4" />
              )}
              <span className="ml-2">Remove</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`border-2 border-dashed transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center py-8">
        {isUploading ? (
          <>
            <IconLoader2 className="h-10 w-10 text-muted-foreground animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </>
        ) : (
          <>
            <IconUpload className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop an image here, or click to select
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement;
                  handleFileSelect(target.files);
                };
                input.click();
              }}
              disabled={disabled}
            >
              Select Image
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Max file size: 4MB
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add apps/cms/components/meal-image-upload.tsx
git commit -m "feat(cms): add MealImageUpload component"
```

---

## Task 6: Integrate Upload Component into Meal Form

**Files:**

- Modify: `apps/cms/app/dashboard/menu/_components/meal-form.tsx`

**Step 1: Add import for the upload component**

At the top of the file, add the import:

```typescript
import { MealImageUpload } from "@/components/meal-image-upload";
```

**Step 2: Add image upload field to the Basic Info card**

Inside the `<TabsContent value="basic">` section, after the `isFeatured` field and before the closing `</CardContent>`, add the image upload field:

```tsx
<FormField
  control={form.control}
  name="imageUrl"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Meal Image</FormLabel>
      <FormControl>
        <MealImageUpload value={field.value} onChange={field.onChange} />
      </FormControl>
      <FormDescription>
        Upload a photo of the meal. Recommended: 16:9 aspect ratio.
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Step 3: Verify form compiles**

Run: `cd apps/cms && bun run check-types`
Expected: No type errors

**Step 4: Commit**

```bash
git add apps/cms/app/dashboard/menu/_components/meal-form.tsx
git commit -m "feat(cms): integrate image upload into meal form"
```

---

## Task 7: Update Meal Deletion to Clean Up Images

**Files:**

- Modify: `apps/cms/lib/actions/meal.actions.ts`

**Step 1: Add import for the deletion action**

At the top of the file, add:

```typescript
import { deleteMealImage } from "@/lib/actions/meal-image.actions";
```

**Step 2: Update deleteMeal function to delete image first**

Replace the `deleteMeal` function with:

```typescript
export async function deleteMeal(id: string) {
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  try {
    // Get meal to check for image
    const meal = await mealService.getMealById(id);

    // Delete image from UploadThing if exists
    if (meal?.imageUrl) {
      const deleteResult = await deleteMealImage(meal.imageUrl);
      if (!deleteResult.success) {
        console.warn("Failed to delete meal image:", deleteResult.error);
        // Continue with meal deletion even if image deletion fails
      }
    }

    await mealService.deleteMeal(id);
    revalidatePath("/dashboard/menu");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete meal:", error);
    return { success: false, error: "Failed to delete meal" };
  }
}
```

**Step 3: Verify no type errors**

Run: `cd apps/cms && bun run check-types`
Expected: No type errors

**Step 4: Commit**

```bash
git add apps/cms/lib/actions/meal.actions.ts
git commit -m "feat(cms): delete meal images from storage on meal deletion"
```

---

## Task 8: Add Environment Variable Documentation

**Files:**

- Modify: `apps/cms/.env.example` (if exists) or document in README

**Step 1: Document required environment variable**

Add to `.env.example` or create it:

```env
# UploadThing - Get token from https://uploadthing.com/dashboard
UPLOADTHING_TOKEN=
```

**Step 2: Commit**

```bash
git add apps/cms/.env.example 2>/dev/null || echo "No .env.example"
git commit -m "docs(cms): add UploadThing env var documentation" --allow-empty
```

---

## Task 9: Manual Testing

**Step 1: Set up UploadThing account**

1. Go to https://uploadthing.com and create an account
2. Create a new app
3. Copy the `UPLOADTHING_TOKEN` from the dashboard
4. Add to `apps/cms/.env`:
   ```
   UPLOADTHING_TOKEN=your_token_here
   ```

**Step 2: Start the CMS dev server**

Run: `cd apps/cms && bun run dev`

**Step 3: Test upload flow**

1. Navigate to `/dashboard/menu`
2. Click "New Meal" or edit an existing meal
3. In the "Basic Info" tab, locate the image upload field
4. Test: Upload a new image
   - Expected: Image uploads and appears in preview
5. Test: Replace the image
   - Expected: Old image deleted, new image appears
   - Verify: Check UploadThing dashboard - only one file should exist
6. Test: Remove the image
   - Expected: Image removed from preview, form field cleared
   - Verify: Check UploadThing dashboard - file should be deleted
7. Test: Save meal with image
   - Expected: Meal saves successfully, image URL persisted
8. Test: Delete meal with image
   - Expected: Meal deleted, image also deleted from UploadThing

**Step 4: Verify auth protection**

1. Try accessing `/api/uploadthing` without admin session
   - Expected: Should fail with unauthorized error

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(cms): complete UploadThing meal image upload integration"
```

---

## Summary

This implementation adds:

1. UploadThing FileRouter with admin auth middleware
2. API route handler at `/api/uploadthing`
3. Server action for deleting images from UploadThing
4. React component for drag-and-drop image upload
5. Integration into existing meal form
6. Automatic image cleanup on meal deletion

The solution is data-efficient - replaced/removed images are deleted immediately from UploadThing storage.
