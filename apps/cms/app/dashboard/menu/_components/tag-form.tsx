"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DietaryTag } from "@fwe/db";
import {
  tagSchema,
  type TagFormInput,
  type TagFormValues,
} from "@fwe/validators";
import * as Icons from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { darkenColor } from "@/lib/utils";

interface TagFormProps {
  initialData?: DietaryTag | null;
  onSubmit: (data: TagFormInput) => Promise<void>;
}

// Common dietary/food related icons
const ICON_OPTIONS = [
  "Leaf",
  "Wheat",
  "Flame",
  "Milk",
  "Fish",
  "Egg",
  "Circle",
  "Beef",
  "Carrot",
  "Apple",
  "Cherry",
  "Citrus",
  "Coffee",
  "Cookie",
  "Croissant",
  "CupSoda",
  "Drumstick",
  "Grape",
  "IceCream",
  "Martini",
  "Pizza",
  "Sandwich",
  "Soup",
  "Utensils",
  "Vegan",
  "Wine",
];

export function TagForm({ initialData, onSubmit }: TagFormProps) {
  const router = useRouter();

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema) as any,
    defaultValues: initialData || {
      name: "",
      color: "#000000",
      icon: "Circle",
    },
  });

  const watchedName = form.watch("name");
  const watchedColor = form.watch("color");
  const watchedIcon = form.watch("icon");

  const handleSubmit = async (data: TagFormValues) => {
    try {
      await onSubmit(data);
      toast.success("Tag saved successfully");
      router.push("/dashboard/menu");
    } catch (error) {
      toast.error("Failed to save tag");
      console.error(error);
    }
  };

  const PreviewIcon = (Icons as any)[watchedIcon] || Icons.Circle;

  const darkerColor = watchedColor ? darkenColor(watchedColor, 40) : "#000000";

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {initialData ? "Edit Tag" : "Create Tag"}
            </h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tag Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Vegetarian" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            type="color"
                            className="w-12 p-1 h-10"
                            {...field}
                          />
                        </FormControl>
                        <Input
                          placeholder="#000000"
                          {...field}
                          className="flex-1"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select icon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ICON_OPTIONS.map((iconName) => {
                            const IconComponent = (Icons as any)[iconName];
                            return (
                              <SelectItem key={iconName} value={iconName}>
                                <div className="flex items-center gap-2">
                                  {IconComponent && (
                                    <IconComponent className="h-4 w-4" />
                                  )}
                                  <span>{iconName}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="hover:cursor-pointer"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" className="hover:cursor-pointer">
              Save Tag
            </Button>
          </div>
        </form>
      </Form>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg bg-muted/10">
              <Badge
                className="text-lg px-3 py-1 gap-2 transition-all duration-300 border"
                style={{
                  backgroundColor: watchedColor + "33", // 20% opacity
                  color: darkerColor,
                  borderColor: darkerColor,
                }}
              >
                <PreviewIcon className="h-4 w-4" />
                {watchedName || "Tag Name"}
              </Badge>
              <p className="mt-4 text-sm text-muted-foreground">
                This is how the tag will appear in the menu.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
