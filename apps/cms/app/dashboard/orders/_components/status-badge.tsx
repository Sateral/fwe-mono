import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "@/lib/constants/order.constants";
import type { FulfillmentStatus } from "@/lib/types/order-types";

export function StatusBadge({ status }: { status: FulfillmentStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} className={cn(config.badgeClass)}>
      {config.label}
    </Badge>
  );
}
