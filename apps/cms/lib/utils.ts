export { cn } from "@fwe/utils/cn";

/**
 * Recursively converts Prisma Decimal instances to plain numbers so the
 * result can safely cross the Server → Client Component boundary in Next.js.
 */
export function toPlainObject<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;
  if (data instanceof Date) return data;
  const d = data as any;
  if (typeof d.toNumber === "function" && "s" in d && "e" in d && "d" in d) {
    return d.toNumber() as T;
  }
  if (Array.isArray(data)) return data.map(toPlainObject) as T;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = toPlainObject(value);
  }
  return result as T;
}

// Helper to darken a hex color by a given amount
export const darkenColor = (color: string, amount: number) => {
  return (
    "#" +
    color
      .replace(/^#/, "")
      .replace(/../g, (color) =>
        (
          "0" +
          Math.min(255, Math.max(0, parseInt(color, 16) - amount)).toString(16)
        ).substr(-2),
      )
  );
};
