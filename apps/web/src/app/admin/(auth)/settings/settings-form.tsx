"use client";

import type { SiteAssetSlot, SiteSettings } from "@ibtatech/leads";
import { useActionState, useId } from "react";
import Image from "next/image";
import { Alert, Button, FieldCheckbox } from "@ibtatech/ui";
import {
  uploadSiteFaviconAction,
  uploadSiteLogoAction,
  type SiteAssetResult,
} from "@/lib/admin/actions";
import { brandImageUrl } from "@/lib/brand-image";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/avif,image/gif";

const COPY: Record<
  SiteAssetSlot,
  { title: string; description: string; uploadLabel: string; hint: string }
> = {
  logo: {
    title: "Logo",
    description:
      "Shown in the public site header. Until one is uploaded the header falls back to the text wordmark.",
    uploadLabel: "Upload logo",
    hint: "Max 5 MB — PNG, JPEG, WebP, AVIF or GIF. A wide image on a transparent background works best.",
  },
  favicon: {
    title: "Favicon",
    description:
      "The site icon in browser tabs, bookmarks and history. It replaces /favicon.svg across the whole site.",
    uploadLabel: "Upload favicon",
    hint: "Max 5 MB — a square PNG of at least 64×64 pixels works best.",
  },
};

function currentKey(settings: SiteSettings, slot: SiteAssetSlot): string | null {
  return slot === "logo" ? settings.logoPath : settings.faviconPath;
}

export function SiteAssetForm({ slot, current }: { slot: SiteAssetSlot; current: string | null }) {
  const formId = useId();
  const [state, formAction, pending] = useActionState<SiteAssetResult | null, FormData>(
    async (_prev, formData) =>
      slot === "logo" ? uploadSiteLogoAction(formData) : uploadSiteFaviconAction(formData),
    null,
  );

  const copy = COPY[slot];
  // The result carries the saved row, so the preview swaps without a reload —
  // including to "nothing" after a remove (hence `applied`, not `saved ?? …`).
  const applied = state?.ok && state.slot === slot;
  const key = applied ? currentKey(state.settings, slot) : current;
  const src = brandImageUrl(key);

  const errorMessage =
    state && !state.ok
      ? (state.message ?? "The image could not be saved. Check that you are signed in as an admin.")
      : null;

  return (
    <form action={formAction} className="gap-4 flex flex-col" data-testid={`${slot}-form`}>
      <div className="gap-3 flex items-start">
        <div
          className={`shrink-0 overflow-hidden rounded-md border border-border-subtle bg-surface ${
            slot === "logo" ? "h-12 max-w-64 px-3 flex items-center" : "size-14 p-2"
          }`}
        >
          {src ? (
            <Image
              src={src}
              alt={copy.title}
              width={slot === "logo" ? 160 : 32}
              height={slot === "logo" ? 32 : 32}
              className={slot === "logo" ? "h-8 w-auto max-w-full" : "size-full"}
              unoptimized
              data-testid={`${slot}-preview`}
            />
          ) : (
            <span className="text-xs text-text-muted" data-testid={`${slot}-preview`}>
              {slot === "logo" ? "Text wordmark" : "Default"}
            </span>
          )}
        </div>
        <div className="gap-1 min-w-0 flex flex-col">
          <p className="text-sm text-text-secondary">{copy.description}</p>
          <p className="text-xs text-text-muted">
            {key ? `Current file: ${key}` : "Nothing uploaded yet."}
          </p>
        </div>
      </div>

      <div className="gap-1.5 flex flex-col">
        <label htmlFor={`${formId}-image`} className="text-sm font-medium text-text">
          {copy.uploadLabel}
        </label>
        <input
          id={`${formId}-image`}
          type="file"
          name="image"
          accept={IMAGE_ACCEPT}
          className="text-sm file:mr-3 file:px-3 file:py-1.5 file:text-xs file:font-medium text-text-secondary file:rounded-md file:border file:border-border-default file:bg-surface file:text-text hover:file:bg-surface-sunken"
          data-testid={`${slot}-input`}
        />
        <p className="text-xs text-text-muted">{copy.hint}</p>
      </div>

      {key && (
        <FieldCheckbox
          label={`Remove ${copy.title.toLowerCase()} (restore the default)`}
          name="remove"
          data-testid={`${slot}-remove`}
        />
      )}

      {errorMessage && (
        <Alert tone="danger" title="Not saved" data-testid={`${slot}-error`}>
          {errorMessage}
        </Alert>
      )}
      {applied && (
        <Alert tone="success" title={`${copy.title} updated`} data-testid={`${slot}-success`}>
          {key
            ? "Saved — the public site picks it up on the next render."
            : "Removed — the site falls back to its default."}
        </Alert>
      )}

      <Button
        type="submit"
        loading={pending}
        disabled={pending}
        className="self-start"
        data-testid={`${slot}-submit`}
      >
        {key ? "Save" : copy.uploadLabel}
      </Button>
    </form>
  );
}
