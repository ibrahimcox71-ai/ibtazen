import type { Metadata } from "next";
import { Image as ImageIcon } from "lucide-react";
import { Card, ErrorState } from "@ibtatech/ui";
import { canManageSiteSettings, getSiteSettings, type SiteSettings } from "@ibtatech/leads";
import { requireUser } from "@/lib/admin/session";
import { SiteAssetForm } from "./settings-form";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await requireUser("/admin/settings");

  if (!canManageSiteSettings(user.role)) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Settings</h1>
        <ErrorState
          title="Not authorized"
          description="Changing the site's logo and favicon requires an admin role."
        />
      </div>
    );
  }

  // A failed read degrades to "not configured" — the fallbacks below are what
  // the public site already renders, so nothing is lost by showing the empty state.
  let settings: SiteSettings = { logoPath: null, faviconPath: null };
  try {
    settings = await getSiteSettings();
  } catch {
    settings = { logoPath: null, faviconPath: null };
  }

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Settings</h1>
        <p className="text-sm text-text-secondary">
          Site branding — the logo in the public header and the favicon in every browser tab.
        </p>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="gap-4 flex flex-col">
          <div className="gap-3 flex items-start">
            <ImageIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-text-muted" />
            <div className="gap-0.5 flex flex-col">
              <h2 className="text-sm font-semibold text-text">Brand assets</h2>
              <p className="text-xs text-text-muted">
                Both images are validated on the server (type, magic bytes, 5 MB ceiling) and stored
                outside the repository. Removing one restores the built-in default.
              </p>
            </div>
          </div>

          <div className="gap-6 flex flex-col divide-y divide-border-subtle">
            <div className="gap-4 pt-4 first:pt-0 flex flex-col">
              <SiteAssetForm slot="logo" current={settings.logoPath} />
            </div>
            <div className="gap-4 pt-4 flex flex-col">
              <SiteAssetForm slot="favicon" current={settings.faviconPath} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
