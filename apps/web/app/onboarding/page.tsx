import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/auth/onboarding-wizard";
import { getServerSession } from "@/lib/auth-server";
import { cmsApi } from "@/lib/cms-api";

export default async function OnboardingPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await cmsApi.users.getById(session.user.id);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 pt-20 sm:pt-24 pb-8 sm:pb-12 bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8 max-w-md">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Welcome to Free Will Eats
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Let&apos;s set up your profile so we can personalize your experience
        </p>
      </div>

      <OnboardingWizard
        defaultValues={{
          name: user?.name ?? session.user.name ?? "",
          phone: user?.phone ?? "",
          deliveryAddress: user?.deliveryAddress ?? "",
          deliveryCity: user?.deliveryCity ?? "",
          deliveryPostal: user?.deliveryPostal ?? "",
          deliveryNotes: user?.deliveryNotes ?? "",
          flavorProfile: user?.flavorProfile ?? undefined,
        }}
        skipHref="/menu"
      />
    </main>
  );
}
