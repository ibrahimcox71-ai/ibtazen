import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "../src/theme";
import { getNextThemeMode, ThemeToggle } from "../src/components/theme-toggle";

describe("single theme toggle", () => {
  it("starts from the active system preference and flips its appearance", () => {
    expect(getNextThemeMode("system", "light")).toBe("dark");
    expect(getNextThemeMode("system", "dark")).toBe("light");
  });

  it("returns to system preference after explicit light mode", () => {
    expect(getNextThemeMode("dark", "dark")).toBe("light");
    expect(getNextThemeMode("light", "light")).toBe("system");
  });

  it("renders one accessible 44px control with a visible focus style", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Switch to dark theme"');
    expect(html).toContain("size-11");
    expect(html).toContain("focus-visible:ring-2");
  });
});
