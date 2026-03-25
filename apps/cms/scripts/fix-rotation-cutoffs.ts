/**
 * Realign `WeeklyRotation.weekStart` / `weekEnd` / `orderCutoff` to the
 * Thursday-anchored fulfillment schedule (America/Toronto).
 *
 * Run with: bunx tsx scripts/fix-rotation-cutoffs.ts
 */

import prisma from "../lib/prisma";
import {
  resolveFulfillmentCycleEnd,
  resolveFulfillmentCycleStart,
  resolveOrderCutoff,
} from "../lib/services/rotation-schedule";

async function fixRotationCutoffs() {
  const rotations = await prisma.weeklyRotation.findMany({
    orderBy: { weekStart: "desc" },
  });

  let fixedCount = 0;

  for (const rotation of rotations) {
    const cycleStart = resolveFulfillmentCycleStart(new Date(rotation.weekStart));
    const correctWeekEnd = resolveFulfillmentCycleEnd(cycleStart);
    const correctCutoff = resolveOrderCutoff(cycleStart);

    const ws = new Date(rotation.weekStart).getTime();
    const we = new Date(rotation.weekEnd).getTime();
    const oc = new Date(rotation.orderCutoff).getTime();

    const drift =
      ws !== cycleStart.getTime() ||
      we !== correctWeekEnd.getTime() ||
      Math.abs(oc - correctCutoff.getTime()) > 60_000;

    if (drift) {
      await prisma.weeklyRotation.update({
        where: { id: rotation.id },
        data: {
          weekStart: cycleStart,
          weekEnd: correctWeekEnd,
          orderCutoff: correctCutoff,
        },
      });
      fixedCount++;
    }
  }

  console.log(`Updated ${fixedCount} rotation(s).`);
}

fixRotationCutoffs().catch(console.error).finally(() => process.exit(0));
