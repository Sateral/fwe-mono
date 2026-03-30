import { settlementMethodSchema } from "@fwe/validators";

import type { ApiCart } from "./index";

type Assert<T extends true> = T;
type IsEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() =>
  T extends B ? 1 : 2
  ? true
  : false;

const defaultSettlementMethod = settlementMethodSchema.options[0]!;

const apiCart: ApiCart = {
  id: "cart_test",
  settlementMethod: defaultSettlementMethod,
  status: "ACTIVE",
  userId: "user_test",
  rotationId: "rotation_test",
  items: [
    {
      id: "item_test",
      mealId: "meal_test",
      rotationId: "rotation_test",
      quantity: 2,
      unitPrice: 14.5,
      substitutions: [],
      modifiers: [],
      notes: null,
      meal: {
        id: "meal_test",
        name: "Meal Test",
        slug: "meal-test",
        imageUrl: null,
      },
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

void apiCart;

type SettlementMethodFromSchema =
  (typeof settlementMethodSchema.options)[number];

type _SettlementMethodMatchesApiCart = Assert<
  IsEqual<SettlementMethodFromSchema, ApiCart["settlementMethod"]>
>;
