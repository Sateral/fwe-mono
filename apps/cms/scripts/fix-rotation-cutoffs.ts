/**
 * One-time script to fix orderCutoff for existing rotations.
 * 
 * The bug: orderCutoff was set to the Tuesday OF the delivery week,
 * but it should be the Tuesday BEFORE the delivery week.
 * 
 * Run with: npx tsx scripts/fix-rotation-cutoffs.ts
 */

import prisma from "../lib/prisma";

async function fixRotationCutoffs() {
  console.log("Fetching all rotations...\n");
  
  const rotations = await prisma.weeklyRotation.findMany({
    orderBy: { weekStart: "desc" },
  });
  
  console.log(`Found ${rotations.length} rotations to check.\n`);
  
  let fixedCount = 0;
  
  for (const rotation of rotations) {
    const weekStart = new Date(rotation.weekStart);
    
    // Correct cutoff is the Tuesday BEFORE the delivery week starts
    // (1 day before Wednesday = Tuesday 23:59:59)
    const correctCutoff = new Date(weekStart);
    correctCutoff.setDate(correctCutoff.getDate() - 1); // Go back to Tuesday
    correctCutoff.setHours(23, 59, 59, 999);
    
    const currentCutoff = new Date(rotation.orderCutoff);
    
    // Check if cutoff needs fixing (more than 1 hour difference)
    const diffMs = Math.abs(currentCutoff.getTime() - correctCutoff.getTime());
    const needsFix = diffMs > 3600000; // More than 1 hour off
    
    console.log(`Rotation ID: ${rotation.id}`);
    console.log(`  Delivery Week: ${weekStart.toDateString()} - ${new Date(rotation.weekEnd).toDateString()}`);
    console.log(`  Current cutoff: ${currentCutoff.toDateString()} ${currentCutoff.toLocaleTimeString()}`);
    console.log(`  Correct cutoff: ${correctCutoff.toDateString()} ${correctCutoff.toLocaleTimeString()}`);
    
    if (needsFix) {
      await prisma.weeklyRotation.update({
        where: { id: rotation.id },
        data: { orderCutoff: correctCutoff },
      });
      console.log(`  ✅ FIXED!`);
      fixedCount++;
    } else {
      console.log(`  ✓ Already correct`);
    }
    
    console.log("");
  }
  
  console.log(`\nDone! Fixed ${fixedCount} rotation(s).`);
}

fixRotationCutoffs()
  .catch(console.error)
  .finally(() => process.exit(0));

