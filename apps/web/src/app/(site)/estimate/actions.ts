"use server";

import type { SubmitResult } from "@ibtatech/leads";
import { submitLead } from "@ibtatech/leads";
import { getClientIp } from "@/lib/lead-action";

export type { SubmitResult as EstimateResult };

type EstimateResult = SubmitResult;

export async function submitEstimateRequest(
  _prev: EstimateResult | null,
  formData: FormData,
): Promise<EstimateResult> {
  const f = formData;
  const get = (key: string) => {
    const v = f.get(key);
    return typeof v === "string" ? v : "";
  };
  const getAll = (key: string) =>
    f
      .getAll(key)
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => v.slice(0, 500));

  const services = getAll("detail.services");
  const features = getAll("detail.features");

  const detail: Record<string, string> = {
    services: services.join(","),
  };
  if (features.length > 0) detail.features = features.join(",");
  const scale = get("detail.scale");
  if (scale) detail.scale = scale;
  const pages = get("detail.pages");
  if (pages) detail.pages = pages;

  const raw = {
    name: get("name"),
    email: get("email"),
    company: get("company") || undefined,
    budgetBand: get("budgetBand") || undefined,
    timeline: get("timeline") || undefined,
    message:
      get("message") ||
      `Estimate request: ${services.join(", ") || "unspecified"}${
        scale ? ` (${scale})` : ""
      }. Features: ${features.join(", ") || "none specified"}.`,
    consent: get("consent") === "on",
    marketingConsent: get("marketingConsent") === "on",
    _gotcha: get("websiteUrl"),
    detail,
  };

  return submitLead(raw, await getClientIp(), "estimate");
}
