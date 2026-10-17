import type { ReactNode } from "react";

/** Pass-through route template; animation belongs to specific page content. */
export default function Template({ children }: { children: ReactNode }) {
  return children;
}
