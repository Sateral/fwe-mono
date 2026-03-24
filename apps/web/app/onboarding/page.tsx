import { redirect } from "next/navigation";

import { ProfileSetupForm } from "@/components/auth/profile-setup-form";
import { getServerSession } from "@/lib/auth-server";
import { cmsApi } from "@/lib/cms-api";

export default async function OnboardingPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await cmsApi.users.getById(session.user.id);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted">
      <ProfileSetupForm
        defaultName={session.user.name || ""}
        defaultValues={{
          name: user?.name ?? session.user.name ?? "",
          phone: user?.phone ?? "",
          deliveryAddress: user?.deliveryAddress ?? "",
          deliveryCity: user?.deliveryCity ?? "",
          deliveryPostal: user?.deliveryPostal ?? "",
          deliveryNotes: user?.deliveryNotes ?? "",
          flavorProfile: user?.flavorProfile ?? undefined,
        }}
        submitLabel="Save Preferences"
        successMessage="Onboarding saved!"
        onSuccessRedirect="/menu"
        showFlavorProfileSection
        startInEditingMode
        showEditToggle={false}
        allowSkip
        skipHref="/menu"
        heading="Tell us how you like to eat"
        description="Share your goals and preferences so future recommendations feel more personal."
      />
    </main>
  );
}
