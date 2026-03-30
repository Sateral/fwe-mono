/**
 * Ops notification for failed order creation (payment succeeded, DB write failed).
 * Uses FAILED_ORDER_ALERT_WEBHOOK_URL when set (Slack incoming webhook, etc.).
 */

export type FailedOrderAlertPayload = {
  stripeSessionId: string;
  stripePaymentIntentId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  errorMessage: string;
  failedOrderId?: string;
};

export async function sendFailedOrderAlertWebhook(
  payload: FailedOrderAlertPayload,
): Promise<boolean> {
  const url = process.env.FAILED_ORDER_ALERT_WEBHOOK_URL;
  if (!url) {
    console.error(
      "[FailedOrderAlert] FAILED_ORDER_ALERT_WEBHOOK_URL is not configured",
    );
    return false;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "fwe-cms",
        ...payload,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[FailedOrderAlert] Webhook request failed", e);
    return false;
  }
}
