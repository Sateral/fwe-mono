"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import type { FlavorProfile } from "@fwe/validators";

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
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/lib/auth-client";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Sparkles,
  User,
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
  goalsInput: z.string().trim().optional(),
  restrictionsInput: z.string().trim().optional(),
  preferencesInput: z.string().trim().optional(),
  involvement: z.enum(["HANDS_ON", "HANDS_OFF"]),
});

type FormValues = z.infer<typeof formSchema>;

interface OnboardingWizardProps {
  defaultValues?: {
    name?: string;
    phone?: string;
    deliveryAddress?: string;
    deliveryCity?: string;
    deliveryPostal?: string;
    deliveryNotes?: string;
    flavorProfile?: FlavorProfile;
  };
  skipHref?: string;
}

function joinValues(values?: string[]) {
  return values?.join(", ") ?? "";
}

function splitValues(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const STEPS = [
  { id: 1, title: "Personal Info", icon: User },
  { id: 2, title: "Delivery", icon: MapPin },
] as const;

export function OnboardingWizard({
  defaultValues,
  skipHref = "/menu",
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      phone: defaultValues?.phone ?? "",
      deliveryAddress: defaultValues?.deliveryAddress ?? "",
      deliveryCity: defaultValues?.deliveryCity ?? "",
      deliveryPostal: defaultValues?.deliveryPostal ?? "",
      deliveryNotes: defaultValues?.deliveryNotes ?? "",
      goalsInput: joinValues(defaultValues?.flavorProfile?.goals),
      restrictionsInput: joinValues(defaultValues?.flavorProfile?.restrictions),
      preferencesInput: joinValues(defaultValues?.flavorProfile?.preferences),
      involvement: defaultValues?.flavorProfile?.involvement ?? "HANDS_ON",
    },
  });

  const persistProfile = async (payload: Record<string, unknown>) => {
    if (!session?.user?.id) {
      toast.error("Please sign in to continue");
      return false;
    }

    const response = await fetch(`/api/user/${session.user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update profile");
    }

    return true;
  };

  const handleNext = async () => {
    // Validate current step fields
    let fieldsToValidate: (keyof FormValues)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ["name", "phone"];
    } else if (currentStep === 2) {
      fieldsToValidate = [
        "deliveryAddress",
        "deliveryCity",
        "deliveryPostal",
        "deliveryNotes",
      ];
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (!isValid) return;

    // Save progress at each step
    try {
      setIsPending(true);
      const data = form.getValues();
      const toNull = (value?: string) => {
        const trimmed = value?.trim();
        return trimmed ? trimmed : null;
      };

      if (currentStep === 1) {
        await persistProfile({
          name: data.name.trim(),
          phone: toNull(data.phone),
        });
        setCurrentStep(2);
      } else if (currentStep === 2) {
        // Step 2 is the final step, complete onboarding
        await persistProfile({
          deliveryAddress: toNull(data.deliveryAddress),
          deliveryCity: toNull(data.deliveryCity),
          deliveryPostal: toNull(data.deliveryPostal),
          deliveryNotes: toNull(data.deliveryNotes),
          onboardingStatus: "COMPLETED",
        });
        toast.success("Profile setup complete!");
        router.push("/menu");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save progress",
      );
    } finally {
      setIsPending(false);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSkip = async () => {
    try {
      setIsPending(true);
      await persistProfile({ onboardingStatus: "SKIPPED" });
      router.push(skipHref);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to skip onboarding",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress Steps */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-center">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-center">
                {/* Step Circle + Label */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all",
                      isCompleted
                        ? "bg-primary text-white"
                        : isActive
                          ? "bg-primary/10 text-primary border-2 border-primary"
                          : "bg-gray-100 text-gray-400",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                    ) : (
                      <StepIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs sm:text-sm font-medium text-center whitespace-nowrap",
                      isActive ? "text-primary" : "text-gray-500",
                    )}
                  >
                    {step.title}
                  </span>
                </div>

                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-12 sm:w-20 h-0.5 mx-2 sm:mx-3 -translate-y-3",
                      currentStep > step.id ? "bg-primary" : "bg-gray-200",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Personal Info */}
      {currentStep === 1 && (
        <Card>
          <CardHeader className="text-center pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl">
              Let&apos;s get to know you
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              We&apos;ll use this to personalize your experience
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  className="bg-muted/50"
                />
                <FieldDescription>
                  Email is linked to your account
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
                      For delivery updates and notifications
                    </FieldDescription>
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Delivery */}
      {currentStep === 2 && (
        <Card>
          <CardHeader className="text-center pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl">
              Where should we deliver?
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              You can always update this later
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                name="deliveryAddress"
                disabled={isPending}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="deliveryAddress">
                      Street Address
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

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <Controller
                  name="deliveryCity"
                  disabled={isPending}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="deliveryCity">City</FieldLabel>
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
                        Postal Code
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
                      placeholder="Buzz code, leave at door, etc."
                      rows={3}
                      className="min-h-[80px] resize-none"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex gap-3">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isPending}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}

          <Button
            type="button"
            onClick={handleNext}
            disabled={isPending}
            className={cn("flex-1", currentStep === 1 && "w-full")}
          >
            {isPending ? (
              <>
                <Spinner /> Saving...
              </>
            ) : currentStep === 2 ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Complete Setup
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Skip Button */}
        <Button
          type="button"
          variant="ghost"
          onClick={handleSkip}
          disabled={isPending}
          className="text-muted-foreground hover:text-foreground"
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}
