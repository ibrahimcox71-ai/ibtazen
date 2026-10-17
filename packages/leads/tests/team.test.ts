import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminUser,
  createTeamMember,
  deleteTeamMember,
  ensureBootstrapAdmin,
  getPrisma,
  hashPassword,
  isCompleteTeamMember,
  listPublishedTeamMembers,
  updateTeamMember,
  type CrmUser,
  type TeamInput,
} from "../src/index";

function input(overrides: Partial<TeamInput> = {}): TeamInput {
  return { name: "Example Person", role: "Engineer", published: false, sortOrder: 0, ...overrides };
}

describe("team member service", () => {
  let actor: CrmUser;
  let createdId = "";

  beforeAll(async () => {
    await ensureBootstrapAdmin().catch(() => undefined);
    const user = await createAdminUser({
      email: "team-test@example.com",
      name: "Team tester",
      passwordHash: hashPassword("correct-horse-battery-staple"),
      role: "admin",
    });
    actor = { id: user.id, email: user.email, name: user.name, role: "admin" };
  });

  afterAll(async () => {
    if (createdId) await getPrisma().teamMember.deleteMany({ where: { id: createdId } });
    await getPrisma().adminUser.deleteMany({ where: { email: "team-test@example.com" } });
  });

  it("requires name and role and limits their lengths and bio", async () => {
    expect(await createTeamMember(actor, input({ name: " " }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await createTeamMember(actor, input({ role: "" }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await createTeamMember(actor, input({ name: "x".repeat(101) }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await createTeamMember(actor, input({ bio: "x".repeat(801) }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
  });

  it("accepts only https linkedin.com URLs", async () => {
    expect(
      await createTeamMember(actor, input({ linkedinUrl: "http://linkedin.com/in/example" })),
    ).toMatchObject({ ok: false, error: "invalid" });
    expect(
      await createTeamMember(
        actor,
        input({ linkedinUrl: "https://linkedin.com.evil.test/in/example" }),
      ),
    ).toMatchObject({ ok: false, error: "invalid" });
  });

  it("hides unpublished and photo-less profiles, then lists a complete published profile", async () => {
    const draft = await createTeamMember(actor, input({ name: "Hidden Person" }));
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    createdId = draft.member.id;
    expect(isCompleteTeamMember(draft.member)).toBe(false);
    expect((await listPublishedTeamMembers()).some((member) => member.id === createdId)).toBe(
      false,
    );
    const publishedWithoutPhoto = await updateTeamMember(
      actor,
      createdId,
      input({ name: "Hidden Person", published: true }),
    );
    expect(publishedWithoutPhoto.ok).toBe(true);
    expect((await listPublishedTeamMembers()).some((member) => member.id === createdId)).toBe(
      false,
    );
    const complete = await updateTeamMember(
      actor,
      createdId,
      input({ name: "Visible Person", photoUrl: `${"a".repeat(40)}.webp`, published: true }),
    );
    expect(complete.ok && isCompleteTeamMember(complete.member)).toBe(true);
    expect((await listPublishedTeamMembers()).some((member) => member.id === createdId)).toBe(true);
    const unpublished = await updateTeamMember(
      actor,
      createdId,
      input({ name: "Visible Person", photoUrl: `${"a".repeat(40)}.webp`, published: false }),
    );
    expect(unpublished.ok).toBe(true);
    expect((await listPublishedTeamMembers()).some((member) => member.id === createdId)).toBe(
      false,
    );
  });

  it("blocks missing and unauthorized actors", async () => {
    expect(await createTeamMember(null, input())).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
    expect(await deleteTeamMember(null, "c0000000000000000000000000")).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
  });
});
