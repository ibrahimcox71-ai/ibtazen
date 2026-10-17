"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import { Alert, Button, Card, Field, FieldCheckbox, FieldTextArea } from "@ibtatech/ui";
import { TEAM_BIO_MAX, TEAM_LINKEDIN_MAX, TEAM_NAME_MAX, TEAM_ROLE_MAX } from "@ibtatech/leads";
import {
  createTeamMemberAction,
  updateTeamMemberAction,
  type TeamResult,
} from "@/lib/admin/actions";
import { teamImageUrl } from "@/lib/team-image";

type InitialTeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
  published: boolean;
  sortOrder: number;
};

export function TeamForm({ initial }: { initial?: InitialTeamMember }) {
  const [preview, setPreview] = useState(teamImageUrl(initial?.photoUrl) ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initial?.linkedinUrl ?? "");
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<TeamResult | null, FormData>(
    (_prev, formData) =>
      initial ? updateTeamMemberAction(initial.id, formData) : createTeamMemberAction(formData),
    null,
  );

  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    },
    [localPreview],
  );

  function selectImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (localPreview) URL.revokeObjectURL(localPreview);
    const next = URL.createObjectURL(file);
    setLocalPreview(next);
    setPreview(next);
  }

  return (
    <div className="gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)] grid items-start">
      <form action={formAction} className="gap-5 flex flex-col">
        {state && !state.ok && (
          <Alert tone="danger" title="Could not save profile">
            {state.message ?? "Check the fields and try again."}
          </Alert>
        )}
        <input type="hidden" name="photoUrl" value={initial?.photoUrl ?? ""} />
        <Card className="gap-4 p-5 flex flex-col">
          <div className="gap-4 sm:grid-cols-2 grid">
            <Field
              label="Name"
              name="name"
              maxLength={TEAM_NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <Field
              label="Role"
              name="role"
              maxLength={TEAM_ROLE_MAX}
              value={role}
              onChange={(event) => setRole(event.target.value)}
              required
            />
          </div>
          <FieldTextArea
            label="Bio (optional)"
            name="bio"
            maxLength={TEAM_BIO_MAX}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={4}
          />
          <Field
            label="LinkedIn URL (optional)"
            name="linkedinUrl"
            type="url"
            maxLength={TEAM_LINKEDIN_MAX}
            value={linkedinUrl}
            onChange={(event) => setLinkedinUrl(event.target.value)}
            placeholder="https://www.linkedin.com/in/..."
          />
          <div className="gap-2 flex flex-col">
            <label htmlFor="team-photo" className="text-sm font-medium text-text">
              Photo (JPEG, PNG or WebP; max 2 MB)
            </label>
            <input
              id="team-photo"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={selectImage}
              className="min-h-11 text-sm file:mr-3 file:min-h-11 file:px-4 file:font-medium text-text-secondary file:rounded-md file:border-0 file:bg-accent-soft file:text-accent"
            />
            {initial?.photoUrl && (
              <label className="gap-2 text-sm inline-flex items-center text-text-secondary">
                <input type="checkbox" name="removeImage" className="size-4 accent-accent" />
                Remove current photo
              </label>
            )}
          </div>
          <div className="gap-4 sm:grid-cols-2 grid items-end">
            <Field
              label="Display order"
              name="sortOrder"
              type="number"
              min={0}
              max={10000}
              step={1}
              defaultValue={initial?.sortOrder ?? 0}
              required
            />
            <FieldCheckbox
              label="Published"
              name="published"
              defaultChecked={initial?.published ?? false}
            />
          </div>
          <div className="gap-3 flex flex-wrap items-center">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : initial ? "Save profile" : "Create profile"}
            </Button>
            {initial && (
              <a
                className="min-h-11 text-sm inline-flex items-center text-accent underline"
                href="/admin/team"
              >
                Cancel
              </a>
            )}
          </div>
        </Card>
      </form>
      <aside className="gap-3 flex flex-col" aria-live="polite">
        <h2 className="text-sm font-semibold text-text">Homepage preview</h2>
        <Card className="gap-4 p-4 flex h-full flex-col">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-surface-sunken">
            {preview && (
              <Image
                src={preview}
                alt={`${name || "Name"}, ${role || "Role"} of Ibtatech`}
                fill
                sizes="(min-width: 1024px) 30vw, 100vw"
                className="object-cover"
                unoptimized
              />
            )}
            {!preview && (
              <div className="inset-0 text-sm absolute flex items-center justify-center text-text-muted">
                Upload a photo to preview
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-accent uppercase">
              {role || "Role"}
            </p>
            <h3 className="mt-2 font-display text-title">{name || "Name"}</h3>
            {bio && <p className="mt-2 text-sm leading-relaxed text-text-secondary">{bio}</p>}
            {linkedinUrl && (
              <span className="mt-4 min-h-11 text-sm font-medium inline-flex items-center text-accent">
                LinkedIn
              </span>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}
