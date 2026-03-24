import type {
  FlavorProfile,
  FlavorProfileInvolvement,
  MealPlan,
} from "@fwe/validators";

import type { ApiFlavorProfile, ApiMealPlan, ApiUser } from "./index";

type Assert<T extends true> = T;
type IsEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() =>
  T extends B ? 1 : 2
  ? true
  : false;

const flavorProfile: ApiFlavorProfile = {
  goals: ["High protein"],
  restrictions: ["Shellfish"],
  preferences: ["Spicy"],
  involvement: "HANDS_ON",
};

const mealPlan: ApiMealPlan = {
  id: "plan_test",
  status: "ACTIVE",
  remainingCredits: 5,
  weeklyCreditCap: 7,
  currentWeekCreditsUsed: 2,
  currentWeekCreditsRemaining: 5,
  autoRenew: true,
  startsAt: new Date().toISOString(),
  endsAt: null,
};

const user: ApiUser = {
  id: "user_test",
  name: "Test User",
  email: "test@example.com",
  image: null,
  phone: null,
  deliveryAddress: null,
  deliveryCity: null,
  deliveryPostal: null,
  deliveryNotes: null,
  profileComplete: false,
  onboardingStatus: "PENDING",
  mealPlan,
  flavorProfile,
  referralCode: null,
};

void user;

type _MealPlanMatchesApiType = Assert<IsEqual<MealPlan, ApiMealPlan>>;
type _FlavorProfileMatchesApiType = Assert<
  IsEqual<FlavorProfile, ApiFlavorProfile>
>;
type _FlavorProfileInvolvementMatchesApiType = Assert<
  IsEqual<FlavorProfileInvolvement, ApiFlavorProfile["involvement"]>
>;
