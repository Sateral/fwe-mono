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

export const uploadRouter: FileRouter = {
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
};

export type UploadRouter = typeof uploadRouter;

// Export UTApi instance for server-side file management
export const utapi = new UTApi();
