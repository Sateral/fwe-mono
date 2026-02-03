import { ProfileSetupForm } from "@/components/auth/profile-setup-form";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  // Get current session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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
