import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Ibtatech Admin" },
  robots: { index: false, follow: false },
};

/** Admin root — routes live under (auth) and login. No public chrome. */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
