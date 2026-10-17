import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { globalErrorStyles } from "@/app/global-error.styles";

/**
 * The root-error boundary renders with no root layout, so it cannot lean on
 * Tailwind classes: its inline styles carry `var(--token, <literal>)` pairs.
 * These tests read the real tokens.css and prove both halves of that pair —
 * the reference is a token that exists, and the literal is that token's own
 * value, so the unstyled fallback still looks like the design system.
 */

const tokensCss = readFileSync(
  fileURLToPath(new URL("../../../packages/ui/tokens.css", import.meta.url)),
  "utf8",
);

interface TokenCall {
  name: string;
  fallback: string;
  start: number;
  end: number;
}

/** Balanced-paren scan of `var(--name, fallback)` calls (fallbacks nest parens). */
function tokenCalls(value: string): TokenCall[] {
  const calls: TokenCall[] = [];
  let from = 0;
  for (;;) {
    const start = value.indexOf("var(", from);
    if (start === -1) return calls;
    let depth = 1;
    let comma = -1;
    let i = start + 4;
    for (; i < value.length && depth > 0; i += 1) {
      const ch = value[i];
      if (ch === "(") depth += 1;
      else if (ch === ")") depth -= 1;
      else if (ch === "," && depth === 1 && comma === -1) comma = i;
    }
    const head = comma === -1 ? start + 4 : comma + 1;
    calls.push({
      name: value.slice(start + 4, comma === -1 ? i - 1 : comma).trim(),
      fallback: comma === -1 ? "" : value.slice(head, i - 1).trim(),
      start,
      end: i,
    });
    from = i;
  }
}

function stripTokenCalls(value: string): string {
  return tokenCalls(value)
    .reverse()
    .reduce((acc, call) => acc.slice(0, call.start) + acc.slice(call.end), value);
}

/** Token values from `@theme` + `:root` only — the `.dark` block would shadow them. */
function lightTokenValues(css: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const match of css.matchAll(/(?:@theme[^{]*|:root)\s*\{([^}]*)\}/g)) {
    const block = match[1] ?? "";
    for (const declaration of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      const name = declaration[1];
      const value = declaration[2]?.trim();
      if (!name || !value) continue;
      // `@theme inline` re-declares tokens as `--x: var(--x)` for the utility
      // layer; that is a mapping, not a value, so it must not shadow the real one.
      if (value === `var(${name})`) continue;
      values[name] = value;
    }
  }
  return values;
}

function resolveToken(name: string, values: Record<string, string>, depth = 0): string {
  const raw = values[name];
  if (raw === undefined) throw new Error(`tokens.css has no ${name}`);
  if (depth > 8) throw new Error(`token ${name} does not resolve`);
  return raw.replace(/var\((--[a-z0-9-]+)\)/g, (_match, ref: string) =>
    resolveToken(ref, values, depth + 1),
  );
}

const styleValues = Object.values(globalErrorStyles).flatMap((style) => Object.values(style));
const stringValues = styleValues.filter((value): value is string => typeof value === "string");
const allCalls = stringValues.flatMap(tokenCalls);

describe("global error styles", () => {
  it("references real tokens from packages/ui/tokens.css", () => {
    const tokens = lightTokenValues(tokensCss);
    expect(allCalls.length).toBeGreaterThan(0);
    expect(allCalls.map((call) => call.name).filter((name) => !(name in tokens))).toEqual([]);
  });

  it("uses a token for every colour — no hand-picked hex outside a var() fallback", () => {
    const rawHexes = stringValues.map(stripTokenCalls).filter((value) => value.includes("#"));
    expect(rawHexes).toEqual([]);
  });

  it("falls back to the token's own value, so it matches with no CSS loaded", () => {
    const tokens = lightTokenValues(tokensCss);
    const mismatches = allCalls
      .map((call) => ({
        name: call.name,
        fallback: call.fallback,
        token: resolveToken(call.name, tokens),
      }))
      .filter((call) => call.fallback !== call.token);
    expect(mismatches).toEqual([]);
  });

  it("keeps the retry button on the 44px touch target the design system promises", () => {
    expect(globalErrorStyles.button.height).toBe(44);
  });
});
