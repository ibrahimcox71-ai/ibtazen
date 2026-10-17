import type { Metadata } from "next";
import Link from "next/link";
import { canAccessCrm, getCaseStudyForActor, parseCaseStudyMetrics } from "@ibtatech/leads";
import { Card, ErrorState } from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import { requireUser } from "@/lib/admin/session";
import { CaseStudyDeleteButton } from "../case-study-delete-button";
import { CaseStudyForm } from "../case-study-form";

export const metadata: Metadata = {
  title: "Edit case study",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditCaseStudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/admin/case-studies/${id}`);

  if (!canAccessCrm(user.role)) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Edit case study</h1>
        <ErrorState
          title="Not authorized"
          description="Managing case studies requires CRM access."
        />
      </div>
    );
  }

  let study: Awaited<ReturnType<typeof getCaseStudyForActor>> | null = null;
  let failed = false;
  try {
    study = await getCaseStudyForActor(user, id);
  } catch {
    failed = true;
  }

  if (failed || !study?.ok) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Edit case study</h1>
        <ErrorState
          title={failed ? "Could not load case study" : "Case study not found"}
          description={
            failed
              ? "The database query failed. Try again."
              : "That case study does not exist (or the link is stale)."
          }
        />
        <Link
          href="/admin/case-studies"
          className={cn(
            "text-sm font-medium self-start text-accent underline-offset-2 hover:underline",
            focusRing,
          )}
        >
          Back to case studies
        </Link>
      </div>
    );
  }

  const { caseStudy } = study;
  const metricCount = parseCaseStudyMetrics(caseStudy.metrics).length;

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">{caseStudy.title}</h1>
        <p className="text-sm text-text-secondary">
          Slot {caseStudy.slotNumber} · created by {caseStudy.createdBy.name} · {metricCount} metric
          {metricCount === 1 ? "" : "s"}
        </p>
        {caseStudy.status === "PUBLISHED" && (
          <p className="text-sm">
            <Link
              href={`/case-studies/${caseStudy.slug}`}
              className={cn(
                "font-medium text-accent underline-offset-2 hover:underline",
                focusRing,
              )}
              target="_blank"
              rel="noreferrer"
            >
              View public page →
            </Link>
          </p>
        )}
      </div>
      <CaseStudyForm
        mode="edit"
        caseStudyId={caseStudy.id}
        initial={{
          title: caseStudy.title,
          clientName: caseStudy.clientName,
          slug: caseStudy.slug,
          slotNumber: caseStudy.slotNumber,
          description: caseStudy.description,
          status: caseStudy.status,
          metrics: parseCaseStudyMetrics(caseStudy.metrics),
          imagePath: caseStudy.imagePath,
          imageAlt: caseStudy.imageAlt,
          videoEmbedUrl: caseStudy.videoEmbedUrl,
          sortOrder: caseStudy.sortOrder,
        }}
      />
      <Card className="gap-3 flex flex-col">
        <div className="gap-1 flex flex-col">
          <h2 className="font-medium text-text">Delete this case study</h2>
          <p className="text-sm text-text-secondary">
            Permanently removes the story, its image and its public URL - /case-studies/
            {caseStudy.slug} stops resolving, and the landing slot frees up. This cannot be undone.
          </p>
        </div>
        <CaseStudyDeleteButton caseStudyId={caseStudy.id} title={caseStudy.title} size="md" />
      </Card>
    </div>
  );
}
