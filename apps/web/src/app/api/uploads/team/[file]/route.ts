import { readTeamImage } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const image = await readTeamImage(file);
  if (!image) return new Response(null, { status: 404 });
  return new Response(image.bytes as BodyInit, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
