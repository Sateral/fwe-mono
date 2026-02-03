"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/lib/auth-client";
import {
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  StickyNote,
  UserRound,
} from "lucide-react";

const optionalMinLength = (minLength: number, message: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || value.length >= minLength, { message });

const formSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone: optionalMinLength(10, "Enter a valid phone number"),
  deliveryAddress: optionalMinLength(5, "Street address is required"),
  deliveryCity: optionalMinLength(2, "City is required"),
  deliveryPostal: optionalMinLength(3, "Postal code is required"),
  deliveryNotes: z.string().trim().optional(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

interface ProfileSetupFormProps extends React.ComponentProps<"div"> {
  defaultName?: string;
  defaultValues?: Partial<ProfileFormValues>;
  submitLabel?: string;
  successMessage?: string;
  onSuccessRedirect?: string | null;
}

const ReadonlyField = ({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}) => (
  <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className="mt-1 text-sm text-foreground">
      {value && value.trim().length > 0 ? value : "Not provided"}
    </div>
  </div>
);

export function ProfileSetupForm({
  className,
  defaultName = "",
  defaultValues,
  submitLabel = "Complete Setup",
  successMessage = "Profile setup complete!",
  onSuccessRedirect = "/menu",
  ...props
}: ProfileSetupFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const resolvedDefaults: ProfileFormValues = useMemo(
    () => ({
      name: defaultValues?.name ?? defaultName ?? "",
      phone: defaultValues?.phone ?? "",
      deliveryAddress: defaultValues?.deliveryAddress ?? "",
      deliveryCity: defaultValues?.deliveryCity ?? "",
      deliveryPostal: defaultValues?.deliveryPostal ?? "",
      deliveryNotes: defaultValues?.deliveryNotes ?? "",
    }),
    [defaultValues, defaultName]
  );

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: resolvedDefaults,
  });

  useEffect(() => {
    if (!defaultValues) return;
    form.reset(resolvedDefaults);
  }, [defaultValues, resolvedDefaults, form]);

  const handleSubmit = async (data: ProfileFormValues) => {
    if (!session?.user?.id) {
      toast.error("Please sign in to continue");
      return;
    }

    try {
      setIsPending(true);
      const toNull = (value?: string) => {
        const trimmed = value?.trim();
        return trimmed ? trimmed : null;
      };
      const payload = {
        name: data.name.trim(),
        phone: toNull(data.phone),
        deliveryAddress: toNull(data.deliveryAddress),
        deliveryCity: toNull(data.deliveryCity),
        deliveryPostal: toNull(data.deliveryPostal),
        deliveryNotes: toNull(data.deliveryNotes),
      };

      const response = await fetch(`/api/user/${session.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      toast.success(successMessage);
      setIsEditing(false);
      if (onSuccessRedirect) {
        router.push(onSuccessRedirect);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save profile"
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Profile Details</h2>
          <p className="text-sm text-muted-foreground">
            Review your personal info and delivery preferences.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (isEditing) {
              form.reset(resolvedDefaults);
            }
            setIsEditing((prev) => !prev);
          }}
          className="gap-2"
        >
          <Pencil className="h-4 w-4" />
          {isEditing ? "Cancel editing" : "Edit profile"}
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Make sure your name and contact details are current.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <FieldGroup>
                  <Controller
                    name="name"
                    disabled={isPending}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="name">Full Name</FieldLabel>
                        <Input
                          {...field}
                          id="name"
                          aria-invalid={fieldState.invalid}
                          placeholder="Jordan Carter"
                          required
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <Field>
                    <FieldLabel>Email Address</FieldLabel>
                    <Input
                      value={session?.user?.email ?? ""}
                      readOnly
                      disabled
                    />
                    <FieldDescription>
                      Email updates are managed at sign-in.
                    </FieldDescription>
                  </Field>

                  <Controller
                    name="phone"
                    disabled={isPending}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="phone">
                          Phone Number (Optional)
                        </FieldLabel>
                        <Input
                          {...field}
                          id="phone"
                          type="tel"
                          aria-invalid={fieldState.invalid}
                          placeholder="(416) 555-1234"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                        <FieldDescription>
                          We&apos;ll text you order updates
                        </FieldDescription>
                      </Field>
                    )}
                  />
                </FieldGroup>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <ReadonlyField
                    label="Full Name"
                    value={form.getValues("name")}
                    icon={<UserRound className="h-4 w-4" />}
                  />
                  <ReadonlyField
                    label="Email"
                    value={session?.user?.email ?? null}
                    icon={<Mail className="h-4 w-4" />}
                  />
                  <ReadonlyField
                    label="Phone"
                    value={form.getValues("phone")}
                    icon={<Phone className="h-4 w-4" />}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Preferences</CardTitle>
              <CardDescription>
                Keep your delivery details up to date.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <FieldGroup>
                  <Controller
                    name="deliveryAddress"
                    disabled={isPending}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="deliveryAddress">
                          Street Address (Optional)
                        </FieldLabel>
                        <Input
                          {...field}
                          id="deliveryAddress"
                          aria-invalid={fieldState.invalid}
                          placeholder="123 Main Street, Unit 4B"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Controller
                      name="deliveryCity"
                      disabled={isPending}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="deliveryCity">
                            City (Optional)
                          </FieldLabel>
                          <Input
                            {...field}
                            id="deliveryCity"
                            aria-invalid={fieldState.invalid}
                            placeholder="Toronto"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      name="deliveryPostal"
                      disabled={isPending}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="deliveryPostal">
                            Postal Code (Optional)
                          </FieldLabel>
                          <Input
                            {...field}
                            id="deliveryPostal"
                            aria-invalid={fieldState.invalid}
                            placeholder="M5V 1A1"
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </div>

                  <Controller
                    name="deliveryNotes"
                    disabled={isPending}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="deliveryNotes">
                          Delivery Notes (Optional)
                        </FieldLabel>
                        <Textarea
                          {...field}
                          id="deliveryNotes"
                          aria-invalid={fieldState.invalid}
                          placeholder="Buzz code 1234, leave at side door, etc."
                          rows={3}
                          className="min-h-[110px] resize-none border-border/70 bg-muted/40"
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                </FieldGroup>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <ReadonlyField
                    label="Address"
                    value={form.getValues("deliveryAddress")}
                    icon={<MapPin className="h-4 w-4" />}
                  />
                  <ReadonlyField
                    label="City"
                    value={form.getValues("deliveryCity")}
                    icon={<MapPin className="h-4 w-4" />}
                  />
                  <ReadonlyField
                    label="Postal Code"
                    value={form.getValues("deliveryPostal")}
                    icon={<MapPin className="h-4 w-4" />}
                  />
                  <ReadonlyField
                    label="Delivery Notes"
                    value={form.getValues("deliveryNotes")}
                    icon={<StickyNote className="h-4 w-4" />}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {isEditing && (
            <Field orientation="vertical" className="pt-2">
              <Button type="submit" disabled={isPending} size="lg">
                {isPending ? (
                  <>
                    <Spinner /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {submitLabel}
                  </>
                )}
              </Button>
            </Field>
          )}
        </div>
      </form>
    </div>
  );
}
