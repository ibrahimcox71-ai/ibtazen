import type { ReactNode } from "react";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Reveal, StaggerGroup, StaggerItem } from "../src/motion";

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

class FakeIntersectionObserver implements IntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  static callback: ObserverCallback | null = null;
  static reset() {
    FakeIntersectionObserver.instances = [];
    FakeIntersectionObserver.callback = null;
  }

  readonly root: Element | null = null;
  readonly rootMargin: string;
  readonly thresholds: readonly number[];
  observed: Element[] = [];
  disconnected = false;

  constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
    FakeIntersectionObserver.callback = callback;
    FakeIntersectionObserver.instances.push(this);
    this.rootMargin = options?.rootMargin ?? "";
    this.thresholds = Array.isArray(options?.threshold)
      ? options.threshold
      : [options?.threshold ?? 0];
  }

  observe(element: Element) {
    this.observed.push(element);
  }
  unobserve(element: Element) {
    this.observed = this.observed.filter((item) => item !== element);
  }
  disconnect() {
    this.disconnected = true;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

function rect(top: number): DOMRect {
  const height = 400;
  return {
    x: 0,
    y: top,
    top,
    bottom: top + height,
    left: 0,
    right: 400,
    width: 400,
    height,
    toJSON: () => ({}),
  };
}

const rendered: { root: Root; container: HTMLElement }[] = [];

function firstObserver(): FakeIntersectionObserver {
  const observer = FakeIntersectionObserver.instances[0];
  if (!observer) throw new Error("expected an IntersectionObserver to be built");
  return observer;
}

function mount(node: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  rendered.push({ root, container });
  return container;
}

function opacityOf(container: HTMLElement): string {
  const node = container.firstElementChild as HTMLElement | null;
  return node?.style.opacity ?? "";
}

beforeEach(() => {
  FakeIntersectionObserver.reset();
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    media: "",
    onchange: null,
  } as unknown as MediaQueryList);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => rect(4000));
});

afterEach(() => {
  for (const { root, container } of rendered.splice(0)) {
    act(() => {
      root.unmount();
    });
    container.remove();
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Reveal", () => {
  it("ships visible server HTML — no opacity:0, no transform", () => {
    const html = renderToStaticMarkup(
      <Reveal className="section">
        <p>Trusted by fast-growing teams</p>
      </Reveal>,
    );
    expect(html).not.toContain("opacity:0");
    expect(html).not.toContain("opacity: 0");
    expect(html).not.toMatch(/translateY/);
  });

  it("ships visible server HTML for staggered grids", () => {
    const html = renderToStaticMarkup(
      <StaggerGroup className="grid">
        <StaggerItem>
          <div>One</div>
        </StaggerItem>
        <StaggerItem>
          <div>Two</div>
        </StaggerItem>
      </StaggerGroup>,
    );
    expect(html).not.toContain("opacity:0");
    expect(html).not.toContain("opacity: 0");
    expect(html).not.toMatch(/translateY/);
  });

  it("stays visible under prefers-reduced-motion and never observes", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      media: "",
      onchange: null,
    } as unknown as MediaQueryList);

    const container = mount(<Reveal>Reduced motion content</Reveal>);

    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    expect(opacityOf(container)).not.toBe("0");
  });

  it("renders statically when it starts inside the viewport", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => rect(120));

    const container = mount(<Reveal>Above the fold</Reveal>);

    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    expect(opacityOf(container)).not.toBe("0");
  });

  it("observes below-the-fold content without hiding it first", () => {
    const container = mount(<Reveal>Below the fold</Reveal>);

    expect(FakeIntersectionObserver.instances).toHaveLength(1);
    const observer = firstObserver();
    expect(observer.rootMargin).toBe("0px 0px 120px 0px");
    expect(observer.thresholds).toEqual([0]);
    expect(opacityOf(container)).not.toBe("0");
  });

  it("hides then fades in once the observer proves a live page", async () => {
    const container = mount(<Reveal>Scroll reveal</Reveal>);
    const callback = FakeIntersectionObserver.callback;
    const target = container.firstElementChild as HTMLElement;
    expect(callback).not.toBeNull();
    expect(target).not.toBeNull();

    const samples: number[] = [];
    const mutation = new MutationObserver(() => {
      const value = target.style.opacity;
      if (value !== "") samples.push(Number(value));
    });
    mutation.observe(target, { attributes: true, attributeFilter: ["style"] });

    act(() => {
      callback?.([{ target, isIntersecting: true } as unknown as IntersectionObserverEntry]);
    });

    await vi.waitFor(() => expect(opacityOf(container)).toBe("1"), {
      timeout: 3000,
      interval: 25,
    });
    mutation.disconnect();

    expect(firstObserver().disconnected).toBe(true);
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.some((value) => value < 1)).toBe(true);
  });

  it("skips observation entirely for immediate content", () => {
    const container = mount(<Reveal immediate>Hero</Reveal>);

    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    expect(opacityOf(container)).not.toBe("0");
  });

  it("reveals instantly when observer never fires (fallback)", async () => {
    const container = mount(<Reveal>Observer stayed silent</Reveal>);
    expect(FakeIntersectionObserver.instances).toHaveLength(1);

    // A dead observer must reveal content after fallback timeout
    expect(opacityOf(container)).not.toBe("0");

    // Wait for fallback timeout (1500ms)
    await new Promise((resolve) => setTimeout(resolve, 1600));

    // Content should still be visible after fallback
    expect(opacityOf(container)).not.toBe("0");
  });

  it("stays visible under reduced motion without animation", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      media: "",
      onchange: null,
    } as unknown as MediaQueryList);

    const container = mount(<Reveal>Reduced motion content</Reveal>);

    expect(FakeIntersectionObserver.instances).toHaveLength(0);
    expect(opacityOf(container)).not.toBe("0");
  });
});
