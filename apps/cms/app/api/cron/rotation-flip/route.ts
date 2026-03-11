import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveOrderableWeekStart } from "@/lib/services/rotation-schedule";
import { weeklyRotationService } from "@/lib/services/weekly-rotation.service";

export async function GET(request: Request) {
  // 1. Security Check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();
    const targetWeekStart = resolveOrderableWeekStart(now);

    const currentRotation = await prisma.weeklyRotation.findFirst({
      where: {
        status: "PUBLISHED",
        weekStart: { not: targetWeekStart },
      },
      orderBy: { weekStart: "asc" },
    });

    if (currentRotation) {
      await prisma.weeklyRotation.update({
        where: { id: currentRotation.id },
        data: { status: "ARCHIVED" },
      });
      console.log(
        `[Cron:RotationFlip] Archived rotation ${currentRotation.id} (Week of ${currentRotation.weekStart})`,
      );
    } else {
      console.log(`[Cron:RotationFlip] No currently PUBLISHED rotation found.`);
    }

    const { rotation } = await weeklyRotationService.getOrCreateOrderingRotation();

    if (rotation.status !== "PUBLISHED") {
      await weeklyRotationService.publishRotation(rotation.id);
      console.log(
        `[Cron:RotationFlip] Published rotation ${rotation.id} (Week of ${rotation.weekStart})`,
      );
    }

    return NextResponse.json({
      success: true,
      archived: currentRotation?.id || null,
      published: rotation.id,
    });
  } catch (error) {
    console.error("Rotation Flip Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
