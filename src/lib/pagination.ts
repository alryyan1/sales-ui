export type PageToken = number | "ellipsis";

/**
 * Builds a windowed page-number sequence (first, last, current ±1, with
 * ellipses for gaps) for rendering compact numbered pagination controls.
 */
export function getPageNumbers(current: number, total: number): PageToken[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: PageToken[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}
