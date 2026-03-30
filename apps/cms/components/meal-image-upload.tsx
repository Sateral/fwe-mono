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
      if (!file) return;
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
