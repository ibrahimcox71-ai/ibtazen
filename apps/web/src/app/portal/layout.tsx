import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Client portal", template: "%s · Client portal" },
  robots: { index: false, follow: false },
};

/** Session checks live in the nested layouts — this shell is chrome only. */
export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
