import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server-action coverage for the admin CRM (check.md #16). Same seam as the
 * portal tests: `getCurrentUser` decides who is calling, the `@ibtatech/leads`
 * services decide whether it is allowed, and the action only wires them and
 * revalidates the right routes.
 */

const mocks = vi.hoisted(() => ({
  addCrmNote: vi.fn(),
  assignLead: vi.fn(),
  changeContractStatus: vi.fn(),
  changeCrmUserRole: vi.fn(),
  changeInvoiceStatus: vi.fn(),
  changeLeadStatus: vi.fn(),
  changeProposalStatus: vi.fn(),
  changeProjectStatus: vi.fn(),
  completeLeadFollowUp: vi.fn(),
  convertWonLeadToClient: vi.fn(),
  createBlogPost: vi.fn(),
  createTeamMember: vi.fn(),
  createContractFromProposal: vi.fn(),
  createCrmUser: vi.fn(),
  createInvoiceFromContract: vi.fn(),
  createLeadFollowUp: vi.fn(),
  createLeadProposal: vi.fn(),
  createCaseStudy: vi.fn(),
  createProjectFromContract: vi.fn(),
  deleteBlogPost: vi.fn(),
  deleteCaseStudy: vi.fn(),
  deleteTeamMember: vi.fn(),
  editLeadProposal: vi.fn(),
  editLeadFollowUp: vi.fn(),
  loginAdmin: vi.fn(),
  provisionPortalAccess: vi.fn(),
  setCrmUserActive: vi.fn(),
  setBlogPostImage: vi.fn(),
  setCaseStudyImage: vi.fn(),
  setSiteAsset: vi.fn(),
  updateBlogPost: vi.fn(),
  updateCaseStudy: vi.fn(),
  updateTeamMember: vi.fn(),
  canMutateLeads: vi.fn((role: string) => role === "admin" || role === "staff"),
  prepareTeamImage: vi.fn(),
  removeTeamImage: vi.fn(),
  storeTeamImage: vi.fn(),
  winLeadFromAcceptedProposal: vi.fn(),
  getCurrentUser: vi.fn(),
  endSession: vi.fn(),
  clearSessionCookie: vi.fn(),
  setSessionCookie: vi.fn(),
  requireUser: vi.fn(),
  getClientIp: vi.fn(),
  prepareBlogImage: vi.fn(),
  prepareBrandImage: vi.fn(),
  prepareCaseStudyImage: vi.fn(),
  removeBlogImage: vi.fn(),
  removeBrandImage: vi.fn(),
  removeCaseStudyImage: vi.fn(),
  storeBlogImage: vi.fn(),
  storeBrandImage: vi.fn(),
  storeCaseStudyImage: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@ibtatech/leads", () => ({
  addCrmNote: mocks.addCrmNote,
  assignLead: mocks.assignLead,
  changeContractStatus: mocks.changeContractStatus,
  changeCrmUserRole: mocks.changeCrmUserRole,
  changeInvoiceStatus: mocks.changeInvoiceStatus,
  changeLeadStatus: mocks.changeLeadStatus,
  changeProposalStatus: mocks.changeProposalStatus,
  changeProjectStatus: mocks.changeProjectStatus,
  completeLeadFollowUp: mocks.completeLeadFollowUp,
  convertWonLeadToClient: mocks.convertWonLeadToClient,
  createBlogPost: mocks.createBlogPost,
  createTeamMember: mocks.createTeamMember,
  createContractFromProposal: mocks.createContractFromProposal,
  createCrmUser: mocks.createCrmUser,
  createInvoiceFromContract: mocks.createInvoiceFromContract,
  createLeadFollowUp: mocks.createLeadFollowUp,
  createLeadProposal: mocks.createLeadProposal,
  createCaseStudy: mocks.createCaseStudy,
  createProjectFromContract: mocks.createProjectFromContract,
  deleteBlogPost: mocks.deleteBlogPost,
  deleteCaseStudy: mocks.deleteCaseStudy,
  deleteTeamMember: mocks.deleteTeamMember,
  editLeadProposal: mocks.editLeadProposal,
  editLeadFollowUp: mocks.editLeadFollowUp,
  loginAdmin: mocks.loginAdmin,
  provisionPortalAccess: mocks.provisionPortalAccess,
  setCrmUserActive: mocks.setCrmUserActive,
  setBlogPostImage: mocks.setBlogPostImage,
  setCaseStudyImage: mocks.setCaseStudyImage,
  setSiteAsset: mocks.setSiteAsset,
  updateBlogPost: mocks.updateBlogPost,
  updateCaseStudy: mocks.updateCaseStudy,
  updateTeamMember: mocks.updateTeamMember,
  canMutateLeads: mocks.canMutateLeads,
  winLeadFromAcceptedProposal: mocks.winLeadFromAcceptedProposal,
}));
vi.mock("@/lib/admin/session", () => ({
  getCurrentUser: mocks.getCurrentUser,
  endSession: mocks.endSession,
  clearSessionCookie: mocks.clearSessionCookie,
  setSessionCookie: mocks.setSessionCookie,
  requireUser: mocks.requireUser,
}));
vi.mock("@/lib/lead-action", () => ({ getClientIp: mocks.getClientIp }));
vi.mock("@/lib/uploads", () => ({
  prepareBlogImage: mocks.prepareBlogImage,
  prepareBrandImage: mocks.prepareBrandImage,
  prepareCaseStudyImage: mocks.prepareCaseStudyImage,
  prepareTeamImage: mocks.prepareTeamImage,
  removeBlogImage: mocks.removeBlogImage,
  removeBrandImage: mocks.removeBrandImage,
  removeCaseStudyImage: mocks.removeCaseStudyImage,
  removeTeamImage: mocks.removeTeamImage,
  storeBlogImage: mocks.storeBlogImage,
  storeBrandImage: mocks.storeBrandImage,
  storeCaseStudyImage: mocks.storeCaseStudyImage,
  storeTeamImage: mocks.storeTeamImage,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  createBlogPostAction,
  createTeamMemberAction,
  createCrmUserAction,
  deleteBlogPostAction,
  deleteCaseStudyAction,
  loginAction,
  updateBlogPostAction,
  updateLeadStatusAction,
  uploadSiteFaviconAction,
  uploadSiteLogoAction,
} from "@/lib/admin/actions";

const actor = { id: "usr_admin", role: "admin", email: "admin@example.com" } as const;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getClientIp.mockResolvedValue("203.0.113.9");
  mocks.canMutateLeads.mockImplementation((role: string) => role === "admin" || role === "staff");
});

describe("team profile actions", () => {
  it("blocks unauthorised users before validating or writing an upload", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const result = await createTeamMemberAction(new FormData());
    expect(result).toEqual({ ok: false, error: "unauthorized" });
    expect(mocks.createTeamMember).not.toHaveBeenCalled();
    expect(mocks.prepareTeamImage).not.toHaveBeenCalled();
  });

  it("lets an authorised CRM user create a profile and revalidates the homepage", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    const member = {
      id: "c0000000000000000000000000",
      name: "Ibrahim Khan",
      role: "Founder",
      photoUrl: null,
    };
    mocks.createTeamMember.mockResolvedValue({ ok: true, member });
    const form = new FormData();
    form.set("name", member.name);
    form.set("role", member.role);
    form.set("sortOrder", "0");
    const result = await createTeamMemberAction(form);
    expect(result).toEqual({ ok: true, member });
    expect(mocks.createTeamMember).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({ name: "Ibrahim Khan", role: "Founder", published: false }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });
});

describe("loginAction", () => {
  it("keeps `next` on-site — protocol-relative targets fall back to the dashboard", async () => {
    const expiresAt = new Date("2026-10-01T00:00:00.000Z");
    mocks.loginAdmin.mockResolvedValue({ ok: true, token: "tok_evil", expiresAt });

    const formData = new FormData();
    formData.set("email", "admin@example.com");
    formData.set("password", "hunter2hunter2");
    formData.set("next", "//evil.example/phish");

    const result = await loginAction(null, formData);

    expect(result).toEqual({ ok: true, token: "tok_evil", expiresAt });
    expect(mocks.loginAdmin).toHaveBeenCalledWith(
      "admin@example.com",
      "hunter2hunter2",
      "203.0.113.9",
    );
    expect(mocks.setSessionCookie).toHaveBeenCalledWith("tok_evil", expiresAt);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/dashboard");
  });

  it("does not set a session or navigate when the credentials are refused", async () => {
    mocks.loginAdmin.mockResolvedValue({ ok: false, error: "invalid_credentials" });

    const formData = new FormData();
    formData.set("email", "admin@example.com");
    formData.set("password", "wrong-password");

    const result = await loginAction(null, formData);

    expect(result).toEqual({ ok: false, error: "invalid_credentials" });
    expect(mocks.setSessionCookie).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("sets the session cookie and follows an on-site `next`", async () => {
    const expiresAt = new Date("2026-10-01T00:00:00.000Z");
    mocks.loginAdmin.mockResolvedValue({ ok: true, token: "tok_1", expiresAt });

    const formData = new FormData();
    formData.set("email", "admin@example.com");
    formData.set("password", "hunter2hunter2");
    formData.set("next", "/admin/leads");

    const result = await loginAction(null, formData);

    expect(result).toEqual({ ok: true, token: "tok_1", expiresAt });
    expect(mocks.setSessionCookie).toHaveBeenCalledWith("tok_1", expiresAt);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/leads");
  });

  it("defaults `next` to the dashboard when the field is missing or empty", async () => {
    mocks.loginAdmin.mockResolvedValue({ ok: true, token: "tok_2", expiresAt: new Date() });

    await loginAction(null, new FormData());

    expect(mocks.redirect).toHaveBeenCalledWith("/admin/dashboard");
  });
});

describe("updateLeadStatusAction", () => {
  it("uses the server-resolved actor and revalidates the lead views on success", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.changeLeadStatus.mockResolvedValue({ ok: true, status: "contacted" });

    const result = await updateLeadStatusAction("lead_1", "contacted");

    expect(result).toEqual({ ok: true, status: "contacted" });
    expect(mocks.changeLeadStatus).toHaveBeenCalledWith(actor, "lead_1", "contacted");
    expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
      "/admin/leads/lead_1",
      "/admin/leads",
      "/admin/dashboard",
    ]);
  });

  it("does not revalidate when the transition is refused", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.changeLeadStatus.mockResolvedValue({ ok: false, error: "invalid_transition" });

    const result = await updateLeadStatusAction("lead_1", "won");

    expect(result).toEqual({ ok: false, error: "invalid_transition" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("createCrmUserAction", () => {
  it("maps the raw form fields and revalidates the user registry", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.createCrmUser.mockResolvedValue({ ok: true });

    const formData = new FormData();
    formData.set("name", "QA Adm");
    formData.set("email", "qa-adm@example.com");
    formData.set("password", "long-enough-passphrase");
    formData.set("role", "staff");

    const result = await createCrmUserAction(formData);

    expect(result).toEqual({ ok: true });
    expect(mocks.createCrmUser).toHaveBeenCalledWith(actor, {
      name: "QA Adm",
      email: "qa-adm@example.com",
      password: "long-enough-passphrase",
      role: "staff",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/users");
  });

  it("returns the service refusal untouched and leaves the registry alone", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.createCrmUser.mockResolvedValue({ ok: false, error: "email_taken" });

    const formData = new FormData();
    formData.set("email", "taken@example.com");

    const result = await createCrmUserAction(formData);

    expect(result).toEqual({ ok: false, error: "email_taken" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

const BLOG_POST = {
  id: "cblog0000000000000000x",
  slug: "cover-story",
  title: "Cover story",
  status: "DRAFT",
  imagePath: null as string | null,
};

const COVER_KEY = "cblog0000000000000000x-deadbeef.png";

function blogForm(): FormData {
  const formData = new FormData();
  formData.set("title", "Cover story");
  formData.set("slug", "cover-story");
  formData.set("excerpt", "What the cover and video add.");
  formData.set("content", "The article body.");
  formData.set("tags", "cro, media");
  formData.set("status", "DRAFT");
  formData.set("imageAlt", "Rebuilt checkout on mobile");
  formData.set("videoEmbedUrl", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  return formData;
}

describe("createBlogPostAction", () => {
  it("maps the media fields and revalidates the public paths on success", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.createBlogPost.mockResolvedValue({ ok: true, post: BLOG_POST });

    const result = await createBlogPostAction(blogForm());

    expect(result).toEqual({ ok: true, post: BLOG_POST });
    expect(mocks.createBlogPost).toHaveBeenCalledWith(actor, {
      title: "Cover story",
      slug: "cover-story",
      excerpt: "What the cover and video add.",
      content: "The article body.",
      tags: ["cro", "media"],
      status: "DRAFT",
      imageAlt: "Rebuilt checkout on mobile",
      videoEmbedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
      "/admin/blog",
      `/admin/blog/${BLOG_POST.id}`,
      "/",
      "/blog",
      "/blog/cover-story",
      "/blog/rss.xml",
      "/sitemap.xml",
      "/llms.txt",
    ]);
    expect(mocks.storeBlogImage).not.toHaveBeenCalled();
  });

  it("stores the attached cover and links its key after the row exists", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.prepareBlogImage.mockResolvedValue({
      ok: true,
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      extension: "png",
    });
    mocks.createBlogPost.mockResolvedValue({ ok: true, post: BLOG_POST });
    mocks.storeBlogImage.mockResolvedValue({ ok: true, key: COVER_KEY });
    mocks.setBlogPostImage.mockResolvedValue({
      ok: true,
      post: { ...BLOG_POST, imagePath: COVER_KEY },
    });

    const formData = blogForm();
    formData.set("image", new File([new Uint8Array([0x89])], "cover.png", { type: "image/png" }));

    const result = await createBlogPostAction(formData);

    expect(result.ok).toBe(true);
    expect(mocks.prepareBlogImage).toHaveBeenCalledTimes(1);
    expect(mocks.storeBlogImage).toHaveBeenCalledWith(
      BLOG_POST.id,
      expect.objectContaining({ ok: true, extension: "png" }),
    );
    expect(mocks.setBlogPostImage).toHaveBeenCalledWith(actor, BLOG_POST.id, COVER_KEY);
    expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
      "/admin/blog",
      `/admin/blog/${BLOG_POST.id}`,
      "/",
      "/blog",
      "/blog/cover-story",
      "/blog/rss.xml",
      "/sitemap.xml",
      "/llms.txt",
      "/admin/blog",
      `/admin/blog/${BLOG_POST.id}`,
      "/",
      "/blog",
      "/blog/cover-story",
      "/blog/rss.xml",
      "/sitemap.xml",
      "/llms.txt",
    ]);
  });

  it("refuses an unusable image before any row is written", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.prepareBlogImage.mockResolvedValue({
      ok: false,
      message: "Images must be 5 MB or smaller.",
    });

    const formData = blogForm();
    formData.set("image", new File([new Uint8Array([0x00])], "huge.png", { type: "image/png" }));

    const result = await createBlogPostAction(formData);

    expect(result).toEqual({
      ok: false,
      error: "invalid",
      message: "Images must be 5 MB or smaller.",
    });
    expect(mocks.createBlogPost).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateBlogPostAction", () => {
  it("clears the stored cover when the remove checkbox is checked", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.updateBlogPost.mockResolvedValue({
      ok: true,
      post: { ...BLOG_POST, imagePath: "cblog0000000000000000x-cafebeef.png" },
    });
    mocks.setBlogPostImage.mockResolvedValue({ ok: true, post: BLOG_POST });

    const formData = blogForm();
    formData.set("removeImage", "on");

    const result = await updateBlogPostAction(BLOG_POST.id, formData);

    expect(result.ok).toBe(true);
    expect(mocks.prepareBlogImage).not.toHaveBeenCalled();
    expect(mocks.setBlogPostImage).toHaveBeenCalledWith(actor, BLOG_POST.id, null);
    expect(mocks.removeBlogImage).toHaveBeenCalledWith("cblog0000000000000000x-cafebeef.png");
  });

  it("leaves the stored cover alone on a plain text edit", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.updateBlogPost.mockResolvedValue({
      ok: true,
      post: { ...BLOG_POST, imagePath: COVER_KEY },
    });

    const result = await updateBlogPostAction(BLOG_POST.id, blogForm());

    expect(result.ok).toBe(true);
    expect(mocks.setBlogPostImage).not.toHaveBeenCalled();
    expect(mocks.removeBlogImage).not.toHaveBeenCalled();
  });
});

describe("deleteBlogPostAction", () => {
  it("drops the stored cover and retires every surface the row fed", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.deleteBlogPost.mockResolvedValue({ ok: true, slug: "cover-story", imagePath: COVER_KEY });

    const result = await deleteBlogPostAction(BLOG_POST.id);

    expect(result).toEqual({ ok: true, slug: "cover-story", imagePath: COVER_KEY });
    expect(mocks.deleteBlogPost).toHaveBeenCalledWith(actor, BLOG_POST.id);
    expect(mocks.removeBlogImage).toHaveBeenCalledWith(COVER_KEY);
    expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
      "/admin/blog",
      `/admin/blog/${BLOG_POST.id}`,
      "/",
      "/blog",
      "/blog/cover-story",
      "/blog/rss.xml",
      "/sitemap.xml",
      "/llms.txt",
    ]);
  });

  it("returns the service refusal without touching disk or the cache", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.deleteBlogPost.mockResolvedValue({ ok: false, error: "not_found" });

    const result = await deleteBlogPostAction(BLOG_POST.id);

    expect(result).toEqual({ ok: false, error: "not_found" });
    expect(mocks.removeBlogImage).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("uploadSiteLogoAction", () => {
  const LOGO_KEY = "logo-deadbeef.png";

  function brandForm(overrides: Record<string, string> = {}): FormData {
    const formData = new FormData();
    for (const [name, value] of Object.entries(overrides)) formData.set(name, value);
    return formData;
  }

  function pngUpload(name = "logo.png"): File {
    return new File([new Uint8Array([0x89, 0x50])], name, { type: "image/png" });
  }

  it("refuses before touching disk when there is no session", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const result = await uploadSiteLogoAction(brandForm());

    expect(result).toEqual({ ok: false, error: "unauthorized" });
    expect(mocks.prepareBrandImage).not.toHaveBeenCalled();
    expect(mocks.storeBrandImage).not.toHaveBeenCalled();
    expect(mocks.setSiteAsset).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("validates before storing anything", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.prepareBrandImage.mockResolvedValue({
      ok: false,
      message: "Images must be 5 MB or smaller.",
    });

    const formData = brandForm();
    formData.set("image", pngUpload("huge.png"));

    const result = await uploadSiteLogoAction(formData);

    expect(result).toEqual({
      ok: false,
      error: "invalid",
      message: "Images must be 5 MB or smaller.",
    });
    expect(mocks.storeBrandImage).not.toHaveBeenCalled();
    expect(mocks.setSiteAsset).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("stores the upload, links it, drops the replaced file and revalidates the chrome", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.prepareBrandImage.mockResolvedValue({
      ok: true,
      bytes: new Uint8Array([0x89, 0x50]),
      extension: "png",
    });
    mocks.storeBrandImage.mockResolvedValue({ ok: true, key: LOGO_KEY });
    mocks.setSiteAsset.mockResolvedValue({
      ok: true,
      settings: { logoPath: LOGO_KEY, faviconPath: null },
      previousKey: "logo-cafebeef.png",
    });

    const formData = brandForm();
    formData.set("image", pngUpload());

    const result = await uploadSiteLogoAction(formData);

    expect(result).toEqual({
      ok: true,
      slot: "logo",
      settings: { logoPath: LOGO_KEY, faviconPath: null },
    });
    expect(mocks.storeBrandImage).toHaveBeenCalledWith(
      "logo",
      expect.objectContaining({ ok: true, extension: "png" }),
    );
    expect(mocks.setSiteAsset).toHaveBeenCalledWith(actor, "logo", LOGO_KEY);
    expect(mocks.removeBrandImage).toHaveBeenCalledWith("logo-cafebeef.png");
    // The public header lives in the root layout; the settings page reads itself.
    expect(mocks.revalidatePath.mock.calls).toEqual([["/", "layout"], ["/admin/settings"]]);
  });

  it("cleans up the stored file when the service refuses the key", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.prepareBrandImage.mockResolvedValue({
      ok: true,
      bytes: new Uint8Array([0x89]),
      extension: "png",
    });
    mocks.storeBrandImage.mockResolvedValue({ ok: true, key: LOGO_KEY });
    mocks.setSiteAsset.mockResolvedValue({ ok: false, error: "unauthorized" });

    const formData = brandForm();
    formData.set("image", pngUpload());

    const result = await uploadSiteLogoAction(formData);

    expect(result).toEqual({ ok: false, error: "unauthorized" });
    expect(mocks.removeBrandImage).toHaveBeenCalledWith(LOGO_KEY);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses an empty form that neither uploads nor removes", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);

    const result = await uploadSiteLogoAction(brandForm());

    expect(result).toEqual({ ok: false, error: "invalid", message: "Choose an image to upload." });
    expect(mocks.setSiteAsset).not.toHaveBeenCalled();
  });
});

describe("uploadSiteFaviconAction", () => {
  it("clears the favicon and drops its file when the remove box is checked", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.setSiteAsset.mockResolvedValue({
      ok: true,
      settings: { logoPath: "logo-deadbeef.png", faviconPath: null },
      previousKey: "favicon-cafebeef.png",
    });

    const formData = new FormData();
    formData.set("remove", "on");

    const result = await uploadSiteFaviconAction(formData);

    expect(result).toEqual({
      ok: true,
      slot: "favicon",
      settings: { logoPath: "logo-deadbeef.png", faviconPath: null },
    });
    expect(mocks.prepareBrandImage).not.toHaveBeenCalled();
    expect(mocks.storeBrandImage).not.toHaveBeenCalled();
    expect(mocks.setSiteAsset).toHaveBeenCalledWith(actor, "favicon", null);
    expect(mocks.removeBrandImage).toHaveBeenCalledWith("favicon-cafebeef.png");
    expect(mocks.revalidatePath.mock.calls).toEqual([["/", "layout"], ["/admin/settings"]]);
  });

  it("returns the service refusal without revalidating", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.setSiteAsset.mockResolvedValue({ ok: false, error: "unauthorized" });

    const formData = new FormData();
    formData.set("remove", "on");

    const result = await uploadSiteFaviconAction(formData);

    expect(result).toEqual({ ok: false, error: "unauthorized" });
    expect(mocks.removeBrandImage).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("deleteCaseStudyAction", () => {
  const CASE_STUDY_ID = "case00000000000000000001";
  const CASE_STUDY_IMAGE = "case00000000000000000001-deadbeef.png";

  it("drops the stored image and retires every surface the row fed", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.deleteCaseStudy.mockResolvedValue({
      ok: true,
      slug: "checkout-rebuild",
      imagePath: CASE_STUDY_IMAGE,
    });

    const result = await deleteCaseStudyAction(CASE_STUDY_ID);

    expect(result).toEqual({ ok: true, slug: "checkout-rebuild", imagePath: CASE_STUDY_IMAGE });
    expect(mocks.deleteCaseStudy).toHaveBeenCalledWith(actor, CASE_STUDY_ID);
    expect(mocks.removeCaseStudyImage).toHaveBeenCalledWith(CASE_STUDY_IMAGE);
    expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual([
      "/admin/case-studies",
      `/admin/case-studies/${CASE_STUDY_ID}`,
      "/",
      "/case-studies",
      "/case-studies/checkout-rebuild",
      "/sitemap.xml",
    ]);
  });

  it("returns the service refusal without touching disk or the cache", async () => {
    mocks.getCurrentUser.mockResolvedValue(actor);
    mocks.deleteCaseStudy.mockResolvedValue({ ok: false, error: "unauthorized" });

    const result = await deleteCaseStudyAction(CASE_STUDY_ID);

    expect(result).toEqual({ ok: false, error: "unauthorized" });
    expect(mocks.removeCaseStudyImage).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
