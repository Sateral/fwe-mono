import { redirect } from "next/navigation";

import { ProfileSetupForm } from "@/components/auth/profile-setup-form";
import { getServerSession } from "@/lib/auth-server";

export default async function OnboardingPage() {
  // Get current session
  const session = await getServerSession();

  // If not logged in, redirect to sign-in
  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted">
      <ProfileSetupForm defaultName={session.user.name || ""} />
    </main>
  );
}
