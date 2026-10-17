import { CASE_STUDY_IMAGE_FILENAME_PATTERN } from "@ibtatech/leads/domain";
import { readCaseStudyImage } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!file || !CASE_STUDY_IMAGE_FILENAME_PATTERN.test(file)) {
    return new Response("Not found", { status: 404 });
  }
  const image = await readCaseStudyImage(file);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(Uint8Array.from(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
