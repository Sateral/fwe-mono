export { cn } from "@fwe/utils/cn";

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
