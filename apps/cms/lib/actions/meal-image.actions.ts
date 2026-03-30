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
      return pathParts[fIndex + 1] ?? null;
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
