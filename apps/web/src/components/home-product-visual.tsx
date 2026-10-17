import { Card } from "@ibtatech/ui";

/** Lightweight, clearly illustrative product-interface artwork for the homepage. */
export function HomeProductVisual() {
  return (
    <div
      role="group"
      aria-label="Illustrative preview of web and mobile product interfaces"
      className="home-product-visual mt-8 max-w-5xl relative mx-auto text-left"
    >
      <div
        aria-hidden
        className="home-product-glow inset-8 blur-3xl absolute rounded-full bg-accent/20"
      />
      <div className="gap-4 md:grid-cols-[1fr_15rem] relative grid items-center">
        <Card className="home-product-float p-3 shadow-lg">
          <div className="gap-2 px-2 pb-3 flex items-center border-b border-border-subtle">
            <span className="size-2 rounded-full bg-danger" />
            <span className="size-2 rounded-full bg-warning" />
            <span className="size-2 rounded-full bg-success" />
            <span className="ml-3 text-xs text-text-muted">Illustrative · project dashboard</span>
          </div>
          <div className="gap-3 p-3 sm:grid-cols-[8rem_1fr] grid">
            <div className="space-y-2 sm:block hidden">
              {["Overview", "Projects", "Reports", "Settings"].map((x) => (
                <div
                  key={x}
                  className="px-3 py-2 text-xs rounded-md bg-surface-sunken text-text-secondary"
                >
                  {x}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-text-muted">PROJECT OVERVIEW</p>
                <p className="mt-1 text-lg font-semibold text-text">Progress, made visible</p>
              </div>
              <div className="gap-2 grid grid-cols-3">
                {["Scope", "Build", "Review"].map((x) => (
                  <div key={x} className="p-3 rounded-lg border border-border-subtle">
                    <p className="text-xs text-text-muted">{x}</p>
                    <div className="mt-3 h-1.5 rounded-full bg-accent/30">
                      <div className="h-1.5 w-2/3 rounded-full bg-accent" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-20 gap-2 p-3 flex items-end rounded-lg bg-surface-sunken">
                {["h-8", "h-12", "h-10", "h-14", "h-9", "h-16"].map((height, i) => (
                  <span key={i} className={`${height} rounded-t flex-1 bg-accent/60`} />
                ))}
              </div>
            </div>
          </div>
        </Card>
        <div className="home-phone-float w-44 p-3 shadow-xl mx-auto rounded-[2rem] border-4 border-border-strong bg-surface-raised">
          <div className="mb-3 h-1 w-10 mx-auto rounded-full bg-border-strong" />
          <p className="font-semibold text-[11px] text-accent">Illustrative · mobile app</p>
          <p className="mt-3 text-sm font-semibold text-text">Your project</p>
          <div className="mt-3 space-y-2">
            {["Latest update", "Next demo", "Shared files"].map((x) => (
              <div key={x} className="p-3 text-xs rounded-lg bg-surface-sunken text-text-secondary">
                {x}
                <span className="mt-2 h-1 rounded block bg-accent/40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
