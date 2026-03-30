-- Money and quantity integrity
ALTER TABLE "Order" ADD CONSTRAINT "Order_quantity_gte_1" CHECK ("quantity" >= 1);
ALTER TABLE "Order" ADD CONSTRAINT "Order_unit_price_non_negative" CHECK ("unitPrice" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_amount_non_negative" CHECK ("totalAmount" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_refund_bounds" CHECK ("refundAmount" >= 0 AND "refundAmount" <= "totalAmount");
ALTER TABLE "Order" ADD CONSTRAINT "Order_stripe_requires_positive_total" CHECK (
  "settlementMethod"::text <> 'STRIPE' OR "totalAmount" > 0
);

ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_quantity_gte_1" CHECK ("quantity" >= 1);
ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_unit_price_non_negative" CHECK ("unitPrice" >= 0);
ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_total_amount_non_negative" CHECK ("totalAmount" >= 0);
ALTER TABLE "OrderIntent" ADD CONSTRAINT "OrderIntent_stripe_requires_positive_total" CHECK (
  "settlementMethod"::text <> 'STRIPE' OR "totalAmount" > 0
);

ALTER TABLE "CheckoutSessionItem" ADD CONSTRAINT "CheckoutSessionItem_quantity_gte_1" CHECK ("quantity" >= 1);
ALTER TABLE "CheckoutSessionItem" ADD CONSTRAINT "CheckoutSessionItem_unit_price_non_negative" CHECK ("unitPrice" >= 0);
ALTER TABLE "CheckoutSessionItem" ADD CONSTRAINT "CheckoutSessionItem_total_non_negative" CHECK ("totalAmount" >= 0);

ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_quantity_gte_1" CHECK ("quantity" >= 1);
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_unit_price_non_negative" CHECK ("unitPrice" >= 0);

ALTER TABLE "OrderGroup" ADD CONSTRAINT "OrderGroup_total_positive" CHECK ("totalAmount" > 0);

ALTER TABLE "Meal" ADD CONSTRAINT "Meal_price_non_negative" CHECK ("price" >= 0);
ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_extra_price_non_negative" CHECK ("extraPrice" >= 0);
ALTER TABLE "SubstitutionOption" ADD CONSTRAINT "SubstitutionOption_price_adjustment_range" CHECK (
  "priceAdjustment" >= -999999.99 AND "priceAdjustment" <= 999999.99
);

-- Modifier selection ranges
ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_max_gte_min" CHECK (
  "maxSelection" IS NULL OR "maxSelection" >= "minSelection"
);
ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_max_positive_when_set" CHECK (
  "maxSelection" IS NULL OR "maxSelection" >= 1
);

-- At most one default substitution per group
CREATE UNIQUE INDEX "SubstitutionOption_one_default_per_group_idx"
  ON "SubstitutionOption" ("groupId")
  WHERE "isDefault" = true;
