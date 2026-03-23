import { SignUpForm } from "@/components/auth/sign-up-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignUpForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          After sign up, we&apos;ll walk you through a quick onboarding questionnaire.
        </p>
      </div>
    </div>
  );
}
