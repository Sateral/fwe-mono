"use server";

import { weeklyRotationService } from "@/lib/services/weekly-rotation.service";
import { RotationStatus } from "@/lib/generated/prisma/client";

// ============================================
// Server Actions for Weekly Rotations
// ============================================

/**
 * Get all rotations (for dashboard list).
 */
export async function getRotations() {
  return await weeklyRotationService.getAllRotations();
}

/**
 * Get current active rotation.
 */
export async function getCurrentRotation() {
  return await weeklyRotationService.getCurrentRotation();
}

/**
 * Get rotation by week start date.
 */
export async function getRotationByWeek(weekStart: Date) {
  return await weeklyRotationService.getRotationByWeek(weekStart);
}

/**
 * Create a new rotation for a specific week.
 */
export async function createRotation(weekStartDate: Date) {
  return await weeklyRotationService.createRotation(weekStartDate);
}

/**
 * Update rotation meals.
 */
export async function updateRotationMeals(
  rotationId: string,
  mealIds: string[]
) {
  return await weeklyRotationService.updateRotationMeals(rotationId, mealIds);
}

/**
 * Publish a rotation.
 */
export async function publishRotation(rotationId: string) {
  return await weeklyRotationService.publishRotation(rotationId);
}

/**
 * Archive a rotation.
 */
export async function archiveRotation(rotationId: string) {
  return await weeklyRotationService.archiveRotation(rotationId);
}

/**
 * Unarchive a rotation (set back to PUBLISHED).
 */
export async function unarchiveRotation(rotationId: string) {
  return await weeklyRotationService.unarchiveRotation(rotationId);
}

/**
 * Get all rotating meals (for meal selector).
 */
export async function getRotatingMeals() {
  return await weeklyRotationService.getRotatingMeals();
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
  return await weeklyRotationService.getAvailableMeals();
}
