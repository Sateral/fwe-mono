"use server";

import { handsOffAssignmentService } from "@/lib/services/hands-off-assignment.service";

export async function assignHandsOffMeals() {
  return handsOffAssignmentService.assignCurrentRotation();
}
