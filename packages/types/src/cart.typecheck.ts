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
};

void apiCart;

type SettlementMethodFromSchema =
  (typeof settlementMethodSchema.options)[number];

type _SettlementMethodMatchesApiCart = Assert<
  IsEqual<SettlementMethodFromSchema, ApiCart["settlementMethod"]>
>;
