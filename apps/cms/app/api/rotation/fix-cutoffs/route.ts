import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireInternalAuth } from "@/lib/api-auth";

/**
 * POST /api/rotation/fix-cutoffs
 * 
 * One-time fix for orderCutoff dates on existing rotations.
 * The bug: orderCutoff was set to Tuesday OF the delivery week,
 * but should be Tuesday BEFORE the delivery week.
 */
export async function POST(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    console.log("[FixCutoffs] Fetching all rotations...");
    
    const rotations = await prisma.weeklyRotation.findMany({
      orderBy: { weekStart: "desc" },
    });
    
    console.log(`[FixCutoffs] Found ${rotations.length} rotations to check.`);
    
    const results = [];
    
    for (const rotation of rotations) {
      const weekStart = new Date(rotation.weekStart);
      
      // Correct cutoff is the Tuesday BEFORE the delivery week starts
      // (1 day before Wednesday = Tuesday 23:59:59)
      const correctCutoff = new Date(weekStart);
      correctCutoff.setDate(correctCutoff.getDate() - 1);
      correctCutoff.setHours(23, 59, 59, 999);
      
      const currentCutoff = new Date(rotation.orderCutoff);
      
      // Check if cutoff needs fixing (more than 1 hour difference)
      const diffMs = Math.abs(currentCutoff.getTime() - correctCutoff.getTime());
      const needsFix = diffMs > 3600000;
      
      const result = {
        id: rotation.id,
        weekStart: weekStart.toISOString(),
        currentCutoff: currentCutoff.toISOString(),
        correctCutoff: correctCutoff.toISOString(),
        fixed: false,
      };
      
      if (needsFix) {
        await prisma.weeklyRotation.update({
          where: { id: rotation.id },
          data: { orderCutoff: correctCutoff },
        });
        result.fixed = true;
        console.log(`[FixCutoffs] Fixed rotation ${rotation.id}`);
      }
      
      results.push(result);
    }
    
    const fixedCount = results.filter(r => r.fixed).length;
    console.log(`[FixCutoffs] Done! Fixed ${fixedCount} rotation(s).`);
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} of ${rotations.length} rotations`,
      results,
    });
  } catch (error) {
    console.error("[FixCutoffs] Error:", error);
    return NextResponse.json(
      { error: "Failed to fix cutoffs", details: String(error) },
      { status: 500 }
    );
  }
}

// Also support GET for easy browser access
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

