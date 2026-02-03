import { Role } from "@fwe/db";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session || session.user.role !== Role.ADMIN) {
    if (session) {
      await auth.api.signOut({ headers: requestHeaders });
    }
    redirect("/sign-in");
  }

  return <>{children}</>;
}
