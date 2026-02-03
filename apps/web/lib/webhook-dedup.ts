/**
 * Webhook Event Deduplication
 *
 * Prevents processing the same Stripe webhook event multiple times.
 * This can happen when:
 * - Stripe retries a webhook that was already processed
 * - Network issues cause duplicate delivery
 * - Server restarts during webhook processing
 *
 * Current implementation uses in-memory storage with automatic cleanup.
 * For production with multiple servers, upgrade to Redis.
 *
 * Usage:
 * ```ts
 * if (isEventProcessed(event.id)) {
 *   return NextResponse.json({ received: true, duplicate: true });
 * }
 * markEventProcessed(event.id);
 * ```
 */

// ============================================
// Configuration
// ============================================

/**
 * How long to remember processed events (24 hours).
 * Should be longer than Stripe's retry window (72 hours for live mode).
 * For production, use 72+ hours with Redis.
 */
const EVENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Maximum events to keep in memory to prevent memory leaks.
 * For production, use Redis with automatic TTL expiration.
 */
const MAX_EVENTS = 10_000;

// ============================================
// In-Memory Store
// ============================================

interface ProcessedEvent {
  eventId: string;
  processedAt: number;
}

const processedEvents = new Map<string, ProcessedEvent>();

// ============================================
// Cleanup (runs every 10 minutes)
// ============================================

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [eventId, event] of processedEvents) {
    if (now - event.processedAt > EVENT_TTL_MS) {
      processedEvents.delete(eventId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[WebhookDedup] Cleaned ${cleaned} expired events`);
  }
}, 10 * 60 * 1000); // Every 10 minutes

// ============================================
// Public API
// ============================================

/**
 * Check if an event has already been processed.
 *
 * @param eventId - The Stripe event ID (e.g., "evt_...")
 * @returns true if the event was already processed, false otherwise
 */
export function isEventProcessed(eventId: string): boolean {
  const event = processedEvents.get(eventId);

  if (!event) {
    return false;
  }

  // Check if the event is still within TTL
  const now = Date.now();
  if (now - event.processedAt > EVENT_TTL_MS) {
    processedEvents.delete(eventId);
    return false;
  }

  return true;
}

/**
 * Mark an event as processed.
 * Call this AFTER successful processing to prevent issues if processing fails.
 *
 * @param eventId - The Stripe event ID (e.g., "evt_...")
 */
export function markEventProcessed(eventId: string): void {
  // Prevent memory overflow in case of attack
  if (processedEvents.size >= MAX_EVENTS) {
    // Remove oldest entries (first 10%)
    const keysToRemove = Array.from(processedEvents.keys()).slice(
      0,
      Math.ceil(MAX_EVENTS * 0.1)
    );
    for (const key of keysToRemove) {
      processedEvents.delete(key);
    }
    console.warn(
      `[WebhookDedup] Memory limit reached, removed ${keysToRemove.length} oldest events`
    );
  }

  processedEvents.set(eventId, {
    eventId,
    processedAt: Date.now(),
  });
}

/**
 * Get the count of tracked events (for monitoring).
 */
export function getProcessedEventCount(): number {
  return processedEvents.size;
}

/**
 * Clear all processed events (for testing).
 */
export function clearProcessedEvents(): void {
  processedEvents.clear();
}


