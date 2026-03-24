"use server";

import { weeklyRotationService } from "@/lib/services/weekly-rotation.service";
import { toPlainObject } from "@/lib/utils";

// ============================================
// Server Actions for Weekly Rotations
// ============================================

/**
 * Get all rotations (for dashboard list).
 */
export async function getRotations() {
  return toPlainObject(await weeklyRotationService.getAllRotations());
}

/**
 * Get current active rotation.
 */
export async function getCurrentRotation() {
  return toPlainObject(await weeklyRotationService.getCurrentRotation());
}

/**
 * Get rotation by week start date.
 */
export async function getRotationByWeek(weekStart: Date) {
  return toPlainObject(await weeklyRotationService.getRotationByWeek(weekStart));
}

/**
 * Create a new rotation for a specific week.
 */
export async function createRotation(weekStartDate: Date) {
  return toPlainObject(
    await weeklyRotationService.createRotation(weekStartDate),
  );
}

/**
 * Update rotation meals.
 */
export async function updateRotationMeals(
  rotationId: string,
  mealIds: string[],
) {
  return toPlainObject(
    await weeklyRotationService.updateRotationMeals(rotationId, mealIds),
  );
}

/**
 * Publish a rotation.
 */
export async function publishRotation(rotationId: string) {
  return toPlainObject(
    await weeklyRotationService.publishRotation(rotationId),
  );
}

/**
 * Archive a rotation.
 */
export async function archiveRotation(rotationId: string) {
  return toPlainObject(
    await weeklyRotationService.archiveRotation(rotationId),
  );
}

/**
 * Unarchive a rotation (set back to PUBLISHED).
 */
export async function unarchiveRotation(rotationId: string) {
  return toPlainObject(
    await weeklyRotationService.unarchiveRotation(rotationId),
  );
}

/**
 * Get all rotating meals (for meal selector).
 */
export async function getRotatingMeals() {
  return toPlainObject(await weeklyRotationService.getRotatingMeals());
}

/**
 * Check if next week needs attention.
 */
export async function checkNextWeekWarning() {
  return await weeklyRotationService.checkNextWeekWarning();
}

/**
 * Get available meals for ordering (signature + current rotation).
 */
export async function getAvailableMeals() {
  return toPlainObject(await weeklyRotationService.getAvailableMeals());
}
