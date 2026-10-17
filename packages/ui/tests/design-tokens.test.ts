import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tokens = readFileSync(resolve(process.cwd(), "tokens.css"), "utf8");

function color(name: string): string {
  const match = tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!match) throw new Error(`Missing color token: ${name}`);
  return match[1]!;
}

function lastColor(name: string): string {
  const matches = [...tokens.matchAll(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "gi"))];
  const match = matches.at(-1);
  if (!match) throw new Error(`Missing semantic color token: ${name}`);
  return match[1]!;
}

/** Last definition of a semantic token, following `var(--x)` chains to a hex. */
function lastValue(name: string): string {
  const matches = [...tokens.matchAll(new RegExp(`--${name}:\\s*([^;]+);`, "g"))];
  const raw = matches.at(-1)?.[1]?.trim();
  if (!raw) throw new Error(`Missing token: ${name}`);
  const reference = raw.match(/^var\((--[a-z0-9-]+)\)$/i);
  return reference ? lastValue(reference[1]!.slice(2)) : raw;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe("shared design tokens", () => {
  it("sets a 16px body size, fluid heading sizes, and a 1200px page container", () => {
    expect(tokens).toMatch(/--text-body:\s*1rem/);
    expect(tokens).toMatch(/--text-title:\s*clamp\(/);
    expect(tokens).toMatch(/--text-headline:\s*clamp\(/);
    expect(tokens).toMatch(/--container-page:\s*75rem/);
  });

  it("keeps secondary body text at WCAG AA contrast in both themes", () => {
    const lightText = color("color-ink-800");
    const lightSunken = color("color-ink-50");
    const darkText = color("color-ink-300");
    const darkRaised = lastColor("surface-raised");
    const darkSunken = lastColor("surface-sunken");

    expect(contrast(lightText, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(lightText, lightSunken)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(darkText, darkRaised)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(darkText, darkSunken)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps dark card borders distinguishable from raised surfaces", () => {
    const darkRaised = lastColor("surface-raised");
    expect(contrast(lastValue("border-subtle"), darkRaised)).toBeGreaterThanOrEqual(3);
    expect(contrast(lastValue("border-default"), darkRaised)).toBeGreaterThanOrEqual(3);
    expect(contrast(lastValue("border-strong"), darkRaised)).toBeGreaterThanOrEqual(3);
  });
});
