"use client";

import { RouteError } from "@/components/route-error";

/** Route errors inside the marketing group keep the header/footer chrome. */
export default function SiteErrorBoundary(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} />;
}
