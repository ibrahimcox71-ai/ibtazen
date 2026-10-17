import type { Metadata } from "next";
import { requireUser } from "@/lib/admin/session";
import { canAccessCrm } from "@ibtatech/leads";
import { ErrorState } from "@ibtatech/ui";
import { CaseStudyForm } from "../case-study-form";

export const metadata: Metadata = {
  title: "New case study",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewCaseStudyPage() {
  const user = await requireUser("/admin/case-studies/new");

  if (!canAccessCrm(user.role)) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">New case study</h1>
        <ErrorState
          title="Not authorized"
          description="Managing case studies requires CRM access."
        />
      </div>
    );
  }

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">New case study</h1>
        <p className="text-sm text-text-secondary">
          Slot 1 is featured in the public Selected work section. Only published case studies appear
          on the website.
        </p>
      </div>
      <CaseStudyForm mode="create" />
    </div>
  );
}
