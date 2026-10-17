import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server-action coverage for the client portal (check.md #16). The actions
 * are tested at their seam: the session helpers decide *who* is calling, the
 * `@ibtatech/leads` services decide *whether* it is allowed, and the action
 * itself only wires the two together — so every test pins one of those edges.
 */

const mocks = vi.hoisted(() => ({
  changePortalPassword: vi.fn(),
  loginPortal: vi.fn(),
  respondToPortalProposal: vi.fn(),
  getCurrentPortalUser: vi.fn(),
  endPortalSession: vi.fn(),
  setSessionCookie: vi.fn(),
  getSessionToken: vi.fn(),
  getClientIp: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@ibtatech/leads", () => ({
  changePortalPassword: mocks.changePortalPassword,
  loginPortal: mocks.loginPortal,
  respondToPortalProposal: mocks.respondToPortalProposal,
}));
vi.mock("@/lib/portal/session", () => ({
  getCurrentPortalUser: mocks.getCurrentPortalUser,
  endPortalSession: mocks.endPortalSession,
  setSessionCookie: mocks.setSessionCookie,
}));
vi.mock("@/lib/admin/session", () => ({ getSessionToken: mocks.getSessionToken }));
vi.mock("@/lib/lead-action", () => ({ getClientIp: mocks.getClientIp }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { changePortalPasswordAction, respondToPortalProposalAction } from "@/lib/portal/actions";

const actor = {
  id: "usr_client",
  role: "client",
  clientId: "cli_1",
  email: "ada@example.com",
} as const;

function passwordForm(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set("currentPassword", "old-passphrase");
  formData.set("newPassword", "new-passphrase");
  for (const [key, value] of Object.entries(overrides)) formData.set(key, value);
  return formData;
}

function consoleErrorSpy() {
  return vi.spyOn(console, "error").mockImplementation(() => undefined);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getClientIp.mockResolvedValue("203.0.113.9");
  mocks.getSessionToken.mockResolvedValue("session-token");
});

describe("respondToPortalProposalAction", () => {
  it("refuses before the service when there is no portal session", async () => {
    mocks.getCurrentPortalUser.mockResolvedValue(null);

    const result = await respondToPortalProposalAction("prop_1", "accept");

    expect(result).toEqual({
      ok: false,
      error: "unauthorized",
      message: "Your session expired — sign in again.",
    });
    expect(mocks.respondToPortalProposal).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("forwards the server-resolved actor and revalidates the portal views", async () => {
    mocks.getCurrentPortalUser.mockResolvedValue(actor);
    mocks.respondToPortalProposal.mockResolvedValue({ ok: true });

    const result = await respondToPortalProposalAction("prop_1", "decline");

    expect(result).toEqual({ ok: true });
    // The actor never comes from the call site — only from the session.
    expect(mocks.respondToPortalProposal).toHaveBeenCalledWith(actor, "prop_1", "decline");
    expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
      "/portal/proposals/prop_1",
      "/portal/proposals",
      "/portal/overview",
    ]);
  });

  it("returns a service refusal untouched and leaves the cache alone", async () => {
    mocks.getCurrentPortalUser.mockResolvedValue(actor);
    mocks.respondToPortalProposal.mockResolvedValue({
      ok: false,
      error: "invalid_transition",
      message: "That proposal is no longer awaiting a decision.",
    });

    const result = await respondToPortalProposalAction("prop_1", "accept");

    expect(result).toEqual({
      ok: false,
      error: "invalid_transition",
      message: "That proposal is no longer awaiting a decision.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("contains an unexpected failure instead of leaking it to the client", async () => {
    const errorSpy = consoleErrorSpy();
    mocks.getCurrentPortalUser.mockResolvedValue(actor);
    mocks.respondToPortalProposal.mockRejectedValue(new Error("connection reset"));

    const result = await respondToPortalProposalAction("prop_1", "accept");

    expect(result).toEqual({
      ok: false,
      error: "invalid",
      message: "Your response could not be recorded.",
    });
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("never swallows a redirect() control-flow signal", async () => {
    const signal = { digest: "NEXT_REDIRECT;/portal/login;303;" };
    mocks.getCurrentPortalUser.mockResolvedValue(actor);
    mocks.respondToPortalProposal.mockRejectedValue(signal);

    await expect(respondToPortalProposalAction("prop_1", "accept")).rejects.toBe(signal);
  });
});

describe("changePortalPasswordAction", () => {
  it("refuses before the service when there is no portal session", async () => {
    mocks.getCurrentPortalUser.mockResolvedValue(null);

    const result = await changePortalPasswordAction(null, passwordForm());

    expect(result).toEqual({
      ok: false,
      error: "unauthorized",
      message: "Your session expired — sign in again.",
    });
    expect(mocks.changePortalPassword).not.toHaveBeenCalled();
  });

  it("sends only the two form fields plus the server-side session context", async () => {
    mocks.getCurrentPortalUser.mockResolvedValue(actor);
    mocks.changePortalPassword.mockResolvedValue({ ok: true });

    const result = await changePortalPasswordAction(null, passwordForm());

    expect(result).toEqual({ ok: true });
    const [receivedActor, payload, context] = mocks.changePortalPassword.mock.calls[0] ?? [];
    expect(receivedActor).toBe(actor);
    // No id/role crosses the wire — the principal comes from the cookie.
    expect(Object.keys(payload as Record<string, unknown>).sort()).toEqual([
      "currentPassword",
      "newPassword",
    ]);
    expect(context).toEqual({ ip: "203.0.113.9", currentSessionToken: "session-token" });
  });

  it("passes a validation failure straight back to the form", async () => {
    mocks.getCurrentPortalUser.mockResolvedValue(actor);
    mocks.changePortalPassword.mockResolvedValue({
      ok: false,
      error: "wrong_password",
      message: "Your current password is not correct.",
    });

    const result = await changePortalPasswordAction(null, passwordForm());

    expect(result).toMatchObject({ ok: false, error: "wrong_password" });
  });

  it("contains an unexpected failure instead of leaking it to the client", async () => {
    const errorSpy = consoleErrorSpy();
    mocks.getCurrentPortalUser.mockResolvedValue(actor);
    mocks.changePortalPassword.mockRejectedValue(new Error("password hash unavailable"));

    const result = await changePortalPasswordAction(null, passwordForm());

    expect(result).toEqual({
      ok: false,
      error: "invalid",
      message: "The new password could not be saved.",
    });
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });

  it("never swallows a redirect() control-flow signal", async () => {
    const signal = { digest: "NEXT_REDIRECT;/portal/login;303;" };
    mocks.getCurrentPortalUser.mockResolvedValue(actor);
    mocks.changePortalPassword.mockRejectedValue(signal);

    await expect(changePortalPasswordAction(null, passwordForm())).rejects.toBe(signal);
  });
});
