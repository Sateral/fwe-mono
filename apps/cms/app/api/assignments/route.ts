import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { handsOffAssignmentService } from "@/lib/services/hands-off-assignment.service";

export async function POST(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const result = await handsOffAssignmentService.assignCurrentRotation();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Failed to create hands-off assignments:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create assignments",
      },
      { status: 500 },
    );
  }
}
