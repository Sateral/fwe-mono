import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { toZonedTime } from "date-fns-tz";

export async function GET(request: Request) {
  // 1. Security Check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const TIMEZONE = "America/Toronto";
    const now = toZonedTime(new Date(), TIMEZONE);

    // 2. Archive Current Rotation
    // We find the currently PUBLISHED rotation
    const currentRotation = await prisma.weeklyRotation.findFirst({
      where: { status: "PUBLISHED" },
    });

    if (currentRotation) {
      await prisma.weeklyRotation.update({
        where: { id: currentRotation.id },
        data: { status: "ARCHIVED" },
      });
      console.log(
        `[Cron:RotationFlip] Archived rotation ${currentRotation.id} (Week of ${currentRotation.weekStart})`
      );
    } else {
      console.log(`[Cron:RotationFlip] No currently PUBLISHED rotation found.`);
    }

    // 3. Publish Next Rotation
    // Find the next rotation that is DRAFT and has local weekStart > current weekStart (or just the earliest DRAFT one?)
    // Ideally, we look for the next chronological rotation.

    // Let's assume we want the rotation for "Next Week".
    // If today is Friday Night (transition time), next week starts roughly in 2 days (Monday).

    const nextRotation = await prisma.weeklyRotation.findFirst({
      where: {
        status: "DRAFT",
        // Find rotations starting in the future
        weekStart: {
          gt: now,
        },
      },
      orderBy: {
        weekStart: "asc",
      },
    });

    if (nextRotation) {
      await prisma.weeklyRotation.update({
        where: { id: nextRotation.id },
        data: { status: "PUBLISHED" },
      });
      console.log(
        `[Cron:RotationFlip] Published rotation ${nextRotation.id} (Week of ${nextRotation.weekStart})`
      );

      return NextResponse.json({
        success: true,
        archived: currentRotation?.id || null,
        published: nextRotation.id,
      });
    } else {
      console.warn(
        `[Cron:RotationFlip] WARNING: No DRAFT rotation found to publish!`
      );
      return NextResponse.json({
        success: false,
        warning: "No next rotation found",
      });
    }
  } catch (error) {
    console.error("Rotation Flip Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
