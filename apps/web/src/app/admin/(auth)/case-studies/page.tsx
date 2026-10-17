import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, ErrorState } from "@ibtatech/ui";
import { cn, focusRing } from "@ibtatech/utils";
import {
  canAccessCrm,
  listCaseStudiesForActor,
  parseCaseStudyMetrics,
  type CaseStudyWithCreator,
} from "@ibtatech/leads";
import { CASE_STUDY_STATUS_LABELS, CASE_STUDY_STATUS_TONES } from "@/lib/admin/labels";
import { requireUser } from "@/lib/admin/session";
import { CaseStudyDeleteButton } from "./case-study-delete-button";

export const metadata: Metadata = {
  title: "Case Studies",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCaseStudiesPage() {
  const user = await requireUser("/admin/case-studies");

  if (!canAccessCrm(user.role)) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Case Studies</h1>
        <ErrorState
          title="Not authorized"
          description="The case study registry requires CRM access."
        />
      </div>
    );
  }

  let caseStudies: CaseStudyWithCreator[] | null = null;
  let failed = false;
  try {
    const result = await listCaseStudiesForActor(user);
    if (result.ok) caseStudies = result.caseStudies;
  } catch {
    failed = true;
  }

  if (!caseStudies) {
    return (
      <div className="gap-4 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Case Studies</h1>
        <ErrorState
          title="Could not load case studies"
          description={
            failed ? "The database query failed. Try again." : "The registry requires CRM access."
          }
        />
      </div>
    );
  }

  return (
    <div className="gap-6 flex flex-col">
      <div className="gap-1 flex flex-col">
        <h1 className="font-semibold tracking-tight font-display text-title">Case Studies</h1>
        <p className="text-sm text-text-secondary">
          {caseStudies.length} case stud{caseStudies.length === 1 ? "y" : "ies"} · slot 1 is the
          featured story in the public Selected work section
        </p>
      </div>

      <div>
        <ButtonLink href="/admin/case-studies/new" data-testid="new-case-study">
          <Plus aria-hidden className="size-4" />
          New case study
        </ButtonLink>
      </div>

      {caseStudies.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No case studies yet"
          description="Create slot 1 to replace the placeholder on the landing page."
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="md:block hidden overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-sm w-full min-w-[840px] text-left">
                <thead className="text-xs tracking-wide border-b border-border-subtle bg-surface-sunken text-text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Slot
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Title
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Client
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Results
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Updated
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {caseStudies.map((study) => {
                    const metricCount = parseCaseStudyMetrics(study.metrics).length;
                    return (
                      <tr
                        key={study.id}
                        className="hover:bg-surface-sunken/60"
                        data-testid="case-study-row"
                      >
                        <td
                          className="px-4 py-3 whitespace-nowrap text-text-secondary"
                          data-testid="case-study-slot"
                        >
                          {study.slotNumber}
                        </td>
                        <td
                          className="px-4 py-3 font-medium text-text"
                          data-testid="case-study-title-cell"
                        >
                          {study.title}
                        </td>
                        <td
                          className="px-4 py-3 text-text-secondary"
                          data-testid="case-study-client-cell"
                        >
                          {study.clientName}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            tone={CASE_STUDY_STATUS_TONES[study.status] ?? "neutral"}
                            data-testid="case-study-status-badge"
                          >
                            {CASE_STUDY_STATUS_LABELS[study.status] ?? study.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          {metricCount} metric{metricCount === 1 ? "" : "s"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                          {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
                            study.updatedAt,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="gap-4 flex flex-wrap items-center">
                            <Link
                              href={`/admin/case-studies/${study.id}`}
                              className={cn(
                                "min-h-11 text-sm inline-flex items-center rounded-md text-accent underline-offset-2 hover:underline",
                                focusRing,
                              )}
                              data-testid="case-study-edit-link"
                            >
                              Edit
                            </Link>
                            <CaseStudyDeleteButton caseStudyId={study.id} title={study.title} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile list */}
          <ul className="gap-2 md:hidden flex flex-col">
            {caseStudies.map((study) => (
              <li key={study.id} data-testid="case-study-row">
                <Card>
                  <div className="gap-3 p-4 flex flex-col">
                    <div className="gap-2 flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-text" data-testid="case-study-title-cell">
                          {study.title}
                        </p>
                        <p className="text-xs truncate text-text-muted">
                          {study.clientName} · slot {study.slotNumber}
                        </p>
                      </div>
                      <Badge
                        tone={CASE_STUDY_STATUS_TONES[study.status] ?? "neutral"}
                        data-testid="case-study-status-badge"
                      >
                        {CASE_STUDY_STATUS_LABELS[study.status] ?? study.status}
                      </Badge>
                    </div>
                    <div className="gap-4 flex flex-wrap items-center">
                      <Link
                        href={`/admin/case-studies/${study.id}`}
                        className={cn(
                          "min-h-11 text-sm inline-flex items-center rounded-md text-accent underline-offset-2 hover:underline",
                          focusRing,
                        )}
                        data-testid="case-study-edit-link"
                      >
                        Edit
                      </Link>
                      <CaseStudyDeleteButton caseStudyId={study.id} title={study.title} />
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
