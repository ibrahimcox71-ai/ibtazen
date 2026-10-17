const TEAM_IMAGE_ROUTE = "/api/uploads/team";
const KEY_PATTERN = /^[a-f0-9]{40}\.(?:jpg|png|webp)$/i;

export function teamImageUrl(key: string | null | undefined): string | null {
  return key && KEY_PATTERN.test(key) ? `${TEAM_IMAGE_ROUTE}/${key}` : null;
}
