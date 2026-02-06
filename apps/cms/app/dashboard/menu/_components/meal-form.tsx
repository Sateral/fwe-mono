"use client";

import { useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconTrash, IconX, IconCheck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  mealSchema,
  type MealFormInput,
  type MealFormValues,
} from "@fwe/validators";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface MealFormProps {
  initialData?: MealFormInput | null;
  tags: { id: string; name: string }[];
  onSubmit: (data: MealFormValues) => Promise<void>;
}

export function MealForm({ initialData, tags, onSubmit }: MealFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("basic");

  const form = useForm<MealFormInput, any, MealFormValues>({
    resolver: zodResolver(mealSchema) as any,
    defaultValues: initialData || {
      name: "",
      slug: "",
      description: "",
      imageUrl: "",
      isActive: true,
      isFeatured: false,
      mealType: "SIGNATURE",
      price: 0,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      substitutionGroups: [],
      modifierGroups: [],
      tags: [],
    },
  });

  const {
    fields: substitutionGroupFields,
    append: appendSubstitutionGroup,
    remove: removeSubstitutionGroup,
  } = useFieldArray({
    control: form.control,
    name: "substitutionGroups",
  });

  const {
    fields: modifierGroupFields,
    append: appendModifierGroup,
    remove: removeModifierGroup,
  } = useFieldArray({
    control: form.control,
    name: "modifierGroups",
  });

  const handleSubmit = async (data: MealFormValues) => {
    try {
      await onSubmit(data);
      toast.success("Meal saved successfully");
      router.push("/dashboard/menu");
    } catch (error) {
      toast.error("Failed to save meal");
      console.error(error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Menu Form
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {initialData ? "Edit Meal" : "Create Meal"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure meal details, pricing, and customer customization options.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit">Save Meal</Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="substitutions">Substitutions</TabsTrigger>
            <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Chicken & Rice" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input placeholder="chicken-and-rice" {...field} />
                      </FormControl>
                      <FormDescription>
                        URL-friendly identifier.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A delicious meal..."
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-4">
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm w-full">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Active Status
                          </FormLabel>
                          <FormDescription>
                            Visible on the menu.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm w-full">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Featured</FormLabel>
                          <FormDescription>
                            Highlight this meal.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="mealType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select meal type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SIGNATURE">
                            Signature (Always Available)
                          </SelectItem>
                          <SelectItem value="ROTATING">
                            Rotating (Weekly Special)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Signature meals are always on the menu. Rotating meals
                        are weekly specials set in the rotation manager.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing & Nutrition</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={(field.value as number | undefined) ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="calories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calories</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={(field.value as number | undefined) ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="protein"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Protein (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={(field.value as number | undefined) ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="carbs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carbs (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={(field.value as number | undefined) ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fat (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={(field.value as number | undefined) ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fiber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fiber (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={(field.value as number | undefined) ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="substitutions" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Substitution Groups</h3>
                <p className="text-sm text-muted-foreground">
                  Define ingredient categories that customers can swap (e.g.,
                  carb source, protein source).
                </p>
              </div>
              <Button
                type="button"
                onClick={() =>
                  appendSubstitutionGroup({
                    name: "",
                    options: [
                      {
                        name: "",
                        isDefault: true,
                        priceAdjustment: 0,
                        calorieAdjust: 0,
                        proteinAdjust: 0,
                        carbsAdjust: 0,
                        fatAdjust: 0,
                        fiberAdjust: 0,
                      },
                    ],
                  })
                }
                size="sm"
              >
                <IconPlus className="mr-2 h-4 w-4" /> Add Group
              </Button>
            </div>
            {substitutionGroupFields.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No substitution groups. Add one to allow customers to
                  customize ingredients.
                </CardContent>
              </Card>
            ) : (
              substitutionGroupFields.map((groupField, groupIndex) => (
                <SubstitutionGroupFields
                  key={groupField.id}
                  control={form.control}
                  index={groupIndex}
                  removeGroup={() => removeSubstitutionGroup(groupIndex)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="modifiers" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Modifier Groups</h3>
                <p className="text-sm text-muted-foreground">
                  Add-on options like sauces, sides, or extras.
                </p>
              </div>
              <Button
                type="button"
                onClick={() =>
                  appendModifierGroup({
                    name: "",
                    type: "SINGLE_SELECT",
                    minSelection: 0,
                    options: [{ name: "", extraPrice: 0 }],
                  })
                }
                size="sm"
              >
                <IconPlus className="mr-2 h-4 w-4" /> Add Modifier Group
              </Button>
            </div>
            {modifierGroupFields.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No modifier groups. Add one to offer add-on options.
                </CardContent>
              </Card>
            ) : (
              modifierGroupFields.map((groupField, index) => (
                <ModifierGroupFields
                  key={groupField.id}
                  control={form.control}
                  index={index}
                  removeGroup={() => removeModifierGroup(index)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="tags" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Dietary Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant={
                              (field.value || [])
                                .map((t) => t.id)
                                .includes(tag.id)
                                ? "default"
                                : "outline"
                            }
                            className="cursor-pointer"
                            onClick={() => {
                              const currentValue = field.value || [];
                              if (
                                currentValue.map((t) => t.id).includes(tag.id)
                              ) {
                                field.onChange(
                                  currentValue.filter((t) => t.id !== tag.id),
                                );
                              } else {
                                field.onChange([...currentValue, tag]);
                              }
                            }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                      <FormDescription>Click to toggle tags.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}

// Helper component for substitution group options
function SubstitutionGroupFields({
  control,
  index,
  removeGroup,
}: {
  control: any;
  index: number;
  removeGroup: () => void;
}) {
  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
    update: updateOption,
  } = useFieldArray({
    control,
    name: `substitutionGroups.${index}.options`,
  });

  const watchedOptions = useWatch({
    control,
    name: `substitutionGroups.${index}.options`,
  });

  const setDefaultOption = (optionIndex: number) => {
    if (!watchedOptions) return;
    watchedOptions.forEach((_: any, i: number) => {
      const current = watchedOptions[i];
      updateOption(i, { ...current, isDefault: i === optionIndex });
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-base">Group {index + 1}</CardTitle>
        <Button type="button" variant="ghost" size="sm" onClick={removeGroup}>
          <IconTrash className="h-4 w-4 text-red-500" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name={`substitutionGroups.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Carb Source" {...field} />
              </FormControl>
              <FormDescription>
                Category name (e.g., "Carb Source", "Protein Type")
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Options</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                appendOption({
                  name: "",
                  isDefault: optionFields.length === 0,
                  priceAdjustment: 0,
                  calorieAdjust: 0,
                  proteinAdjust: 0,
                  carbsAdjust: 0,
                  fatAdjust: 0,
                  fiberAdjust: 0,
                })
              }
            >
              <IconPlus className="mr-2 h-3 w-3" /> Add Option
            </Button>
          </div>

          <div className="text-xs text-muted-foreground mb-2">
            First option (index 0) is the default. Click the check icon to set
            as default.
          </div>

          {optionFields.map((optionField, optionIndex) => (
            <div
              key={optionField.id}
              className="border rounded-lg p-3 space-y-3"
            >
              <div className="flex items-center gap-2">
                <FormField
                  control={control}
                  name={`substitutionGroups.${index}.options.${optionIndex}.name`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder="Option Name (e.g., White Rice)"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`substitutionGroups.${index}.options.${optionIndex}.isDefault`}
                  render={({ field }) => (
                    <Button
                      type="button"
                      variant={field.value ? "default" : "outline"}
                      size="icon"
                      onClick={() => setDefaultOption(optionIndex)}
                      title={field.value ? "Default option" : "Set as default"}
                    >
                      <IconCheck className="h-4 w-4" />
                    </Button>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(optionIndex)}
                  disabled={optionFields.length === 1}
                >
                  <IconX className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                <FormField
                  control={control}
                  name={`substitutionGroups.${index}.options.${optionIndex}.priceAdjustment`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Price Adjustment ($)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-5 gap-2">
                <FormField
                  control={control}
                  name={`substitutionGroups.${index}.options.${optionIndex}.calorieAdjust`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Cal Adj.</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`substitutionGroups.${index}.options.${optionIndex}.proteinAdjust`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Protein Adj.</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`substitutionGroups.${index}.options.${optionIndex}.carbsAdjust`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Carbs Adj.</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`substitutionGroups.${index}.options.${optionIndex}.fatAdjust`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Fat Adj.</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`substitutionGroups.${index}.options.${optionIndex}.fiberAdjust`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Fiber Adj.</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper component for nested modifier options
function ModifierGroupFields({
  control,
  index,
  removeGroup,
}: {
  control: any;
  index: number;
  removeGroup: () => void;
}) {
  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control,
    name: `modifierGroups.${index}.options`,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-base">Modifier Group {index + 1}</CardTitle>
        <Button type="button" variant="ghost" size="sm" onClick={removeGroup}>
          <IconTrash className="h-4 w-4 text-red-500" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name={`modifierGroups.${index}.name`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group Name</FormLabel>
                <FormControl>
                  <Input placeholder="Sides" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`modifierGroups.${index}.type`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="SINGLE_SELECT">Single Select</SelectItem>
                    <SelectItem value="MULTI_SELECT">Multi Select</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Options</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => appendOption({ name: "", extraPrice: 0 })}
            >
              <IconPlus className="mr-2 h-3 w-3" /> Add Option
            </Button>
          </div>
          {optionFields.map((optionField, optionIndex) => (
            <div key={optionField.id} className="flex items-end gap-2">
              <FormField
                control={control}
                name={`modifierGroups.${index}.options.${optionIndex}.name`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Option Name" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`modifierGroups.${index}.options.${optionIndex}.extraPrice`}
                render={({ field }) => (
                  <FormItem className="w-24">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeOption(optionIndex)}
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
