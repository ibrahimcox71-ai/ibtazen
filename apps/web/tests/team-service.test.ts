import { describe, expect, it } from "vitest";
import { createTeamMember, isVisibleTeamMember } from "@ibtatech/leads";

const actor = {
  id: "c0000000000000000000000000",
  name: "Admin",
  email: "admin@example.com",
  role: "admin" as const,
};

function profile(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ibrahim Khan",
    role: "Founder",
    bio: "",
    photoUrl: null,
    linkedinUrl: "",
    published: false,
    sortOrder: 0,
    ...overrides,
  };
}

describe("team service boundary validation", () => {
  it("rejects missing fields and overlong content before touching Prisma", async () => {
    expect(await createTeamMember(actor, profile({ name: " " }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await createTeamMember(actor, profile({ role: "" }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
    expect(await createTeamMember(actor, profile({ bio: "x".repeat(801) }))).toMatchObject({
      ok: false,
      error: "invalid",
    });
  });

  it("rejects a non-HTTPS or non-LinkedIn URL", async () => {
    expect(
      await createTeamMember(actor, profile({ linkedinUrl: "http://linkedin.com/in/ibrahim" })),
    ).toMatchObject({ ok: false, error: "invalid" });
    expect(
      await createTeamMember(
        actor,
        profile({ linkedinUrl: "https://linkedin.com.example.org/in/x" }),
      ),
    ).toMatchObject({ ok: false, error: "invalid" });
  });

  it("enforces the full homepage visibility rule", () => {
    expect(
      isVisibleTeamMember({
        name: "Ibrahim Khan",
        role: "Founder",
        photoUrl: null,
        published: true,
      }),
    ).toBe(false);
    expect(
      isVisibleTeamMember({
        name: "Ibrahim Khan",
        role: "Founder",
        photoUrl: "a".repeat(40) + ".jpg",
        published: false,
      }),
    ).toBe(false);
    expect(
      isVisibleTeamMember({
        name: "Ibrahim Khan",
        role: "Founder",
        photoUrl: "a".repeat(40) + ".jpg",
        published: true,
      }),
    ).toBe(true);
  });
});
