import { z } from "zod";

/** Trim, collapse internal whitespace, cap length — shared by all schemas. */
export const trimmed = (max: number) =>
  z
    .string()
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max));
