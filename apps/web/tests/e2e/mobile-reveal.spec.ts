import { test, expect } from "@playwright/test";

test.describe("Mobile reveal visibility", () => {
  test("360px viewport - slow scroll - count hidden elements", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.setViewportSize({ width: 360, height: 667 });

    // Scroll slowly to the bottom in steps
    const scrollSteps = 10;
    const viewportHeight = 667;
    const documentHeight = await page.evaluate(() => document.body.scrollHeight);
    const stepSize = (documentHeight - viewportHeight) / scrollSteps;

    for (let i = 0; i <= scrollSteps; i++) {
      const scrollY = Math.min(i * stepSize, documentHeight - viewportHeight);
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await page.waitForTimeout(500); // Wait between scroll steps
    }

    // Wait for fallback reveal timeout (1.5s)
    await page.waitForTimeout(2000);

    // Count elements with opacity: 0 or visibility hidden
    const hiddenResult = await page.evaluate(() => {
      const allElements = document.querySelectorAll("*");
      let count = 0;
      const hiddenSelectors: string[] = [];

      allElements.forEach((el) => {
        const styles = window.getComputedStyle(el);
        const opacity = parseFloat(styles.opacity);
        const visibility = styles.visibility;
        const display = styles.display;

        // Check if element is hidden and visible in viewport
        const rect = el.getBoundingClientRect();
        const inViewport = rect.top < window.innerHeight && rect.bottom > 0;

        if (inViewport && (opacity === 0 || visibility === "hidden" || display === "none")) {
          count++;
          const selector =
            el.tagName.toLowerCase() +
            (el.className ? "." + el.className.split(" ").join(".") : "") +
            (el.id ? "#" + el.id : "");
          hiddenSelectors.push(selector);
        }
      });

      return { count, hiddenSelectors };
    });

    console.log(`Hidden elements at 360px: ${hiddenResult.count}`);
    console.log("Hidden selectors:", hiddenResult.hiddenSelectors);

    expect(hiddenResult.count).toBe(0);
  });

  test("390px viewport - slow scroll - count hidden elements", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.setViewportSize({ width: 390, height: 844 });

    // Scroll slowly to the bottom in steps
    const scrollSteps = 10;
    const viewportHeight = 844;
    const documentHeight = await page.evaluate(() => document.body.scrollHeight);
    const stepSize = (documentHeight - viewportHeight) / scrollSteps;

    for (let i = 0; i <= scrollSteps; i++) {
      const scrollY = Math.min(i * stepSize, documentHeight - viewportHeight);
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await page.waitForTimeout(500);
    }

    // Wait for fallback reveal timeout
    await page.waitForTimeout(2000);

    const hiddenCount = await page.evaluate(() => {
      const allElements = document.querySelectorAll("*");
      let count = 0;

      allElements.forEach((el) => {
        const styles = window.getComputedStyle(el);
        const opacity = parseFloat(styles.opacity);
        const visibility = styles.visibility;
        const display = styles.display;

        const rect = el.getBoundingClientRect();
        const inViewport = rect.top < window.innerHeight && rect.bottom > 0;

        if (inViewport && (opacity === 0 || visibility === "hidden" || display === "none")) {
          count++;
        }
      });

      return count;
    });

    console.log(`Hidden elements at 390px: ${hiddenCount}`);
    expect(hiddenCount).toBe(0);
  });

  test("360px - page loaded already scrolled to bottom", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.setViewportSize({ width: 360, height: 667 });

    // Scroll to bottom immediately after load
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Wait for fallback reveal timeout
    await page.waitForTimeout(2000);

    const hiddenCount = await page.evaluate(() => {
      const allElements = document.querySelectorAll("*");
      let count = 0;

      allElements.forEach((el) => {
        const styles = window.getComputedStyle(el);
        const opacity = parseFloat(styles.opacity);
        const visibility = styles.visibility;
        const display = styles.display;

        const rect = el.getBoundingClientRect();
        const inViewport = rect.top < window.innerHeight && rect.bottom > 0;

        if (inViewport && (opacity === 0 || visibility === "hidden" || display === "none")) {
          count++;
        }
      });

      return count;
    });

    console.log(`Hidden elements when loaded scrolled: ${hiddenCount}`);
    expect(hiddenCount).toBe(0);
  });

  test("360px - prefers-reduced-motion: reduce", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.setViewportSize({ width: 360, height: 667 });

    // Enable reduced motion
    await page.emulateMedia({ reducedMotion: "reduce" });

    // Scroll slowly to the bottom
    const scrollSteps = 10;
    const viewportHeight = 667;
    const documentHeight = await page.evaluate(() => document.body.scrollHeight);
    const stepSize = (documentHeight - viewportHeight) / scrollSteps;

    for (let i = 0; i <= scrollSteps; i++) {
      const scrollY = Math.min(i * stepSize, documentHeight - viewportHeight);
      await page.evaluate((y) => window.scrollTo(0, y), scrollY);
      await page.waitForTimeout(500);
    }

    // Wait for fallback reveal timeout
    await page.waitForTimeout(2000);

    const hiddenCount = await page.evaluate(() => {
      const allElements = document.querySelectorAll("*");
      let count = 0;

      allElements.forEach((el) => {
        const styles = window.getComputedStyle(el);
        const opacity = parseFloat(styles.opacity);
        const visibility = styles.visibility;
        const display = styles.display;

        const rect = el.getBoundingClientRect();
        const inViewport = rect.top < window.innerHeight && rect.bottom > 0;

        if (inViewport && (opacity === 0 || visibility === "hidden" || display === "none")) {
          count++;
        }
      });

      return count;
    });

    console.log(`Hidden elements with reduced motion: ${hiddenCount}`);
    expect(hiddenCount).toBe(0);
  });

  test("SSR safety - JavaScript disabled", async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
    });
    const page = await context.newPage();

    await page.goto("http://localhost:3000");
    await page.setViewportSize({ width: 360, height: 667 });

    // Check that no elements have opacity:0 in server-rendered HTML
    const hasOpacityZero = await page.evaluate(() => {
      const allElements = document.querySelectorAll("*");
      for (const el of allElements) {
        const styles = window.getComputedStyle(el);
        const opacity = parseFloat(styles.opacity);
        if (opacity === 0) {
          return true;
        }
      }
      return false;
    });

    console.log(`Has opacity:0 in SSR HTML: ${hasOpacityZero}`);
    expect(hasOpacityZero).toBe(false);

    await page.close();
    await context.close();
  });
});
