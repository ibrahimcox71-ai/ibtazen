import type { Metadata } from "next";
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogTrigger,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
  EmptyState,
  ErrorState,
  Field,
  FieldGroup,
  LoadingState,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  Textarea,
} from "@ibtatech/ui";
import { Inbox } from "lucide-react";

export const metadata: Metadata = {
  title: "Design System",
  description: "Ibtatech design system reference — tokens, components and motion.",
  robots: { index: false },
};

export default function DesignSystemPage() {
  return (
    <div className="max-w-5xl px-4 py-16 sm:px-6 lg:px-8 mx-auto w-full">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-accent">Phase 2 deliverable</p>
        <h1 className="mt-2 font-display text-headline">Ibtatech Design System</h1>
        <p className="mt-4 text-lead text-text-secondary">
          Every surface of the platform is composed from these tokens and primitives. Toggle the
          theme in the header to verify light, dark and system modes.
        </p>
      </header>

      <div className="mt-14 gap-14 flex flex-col">
        <Section title="Typography">
          <div className="gap-4 flex flex-col">
            <p className="font-display text-display">Display — Aa 1920</p>
            <p className="font-display text-headline">Headline — fluid clamp scale</p>
            <p className="text-title">Title — section and card headings</p>
            <p className="text-lead">Lead — intro paragraphs that carry the narrative.</p>
            <p className="text-sm text-text-secondary">
              Body small · secondary · Inter variable, tuned for long-form readability.
            </p>
            <p className="text-sm font-mono">mono — JetBrains Mono for data & code</p>
          </div>
        </Section>

        <Section title="Colors">
          <Swatches
            rows={[
              [
                "surface / raised / sunken / inverted",
                "bg-surface border-border-default",
                "bg-surface-raised",
                "bg-surface-sunken",
                "bg-surface-inverted",
              ],
              ["text", "bg-text", "bg-text-secondary", "bg-text-muted", "bg-accent"],
              ["status", "bg-success", "bg-warning", "bg-danger", "bg-info"],
              [
                "borders",
                "bg-border-subtle",
                "bg-border-default",
                "bg-border-strong",
                "bg-overlay",
              ],
            ]}
          />
        </Section>

        <Section title="Buttons">
          <div className="gap-3 flex flex-wrap items-center">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="inverted">Inverted</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
            <ButtonLink href="/book" variant="secondary">
              ButtonLink
            </ButtonLink>
          </div>
          <div className="mt-4 gap-3 flex flex-wrap items-center">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </Section>

        <Section title="Inputs & forms">
          <div className="max-w-2xl gap-5 sm:grid-cols-2 grid">
            <Field label="Work email" type="email" placeholder="you@company.com" required />
            <Field
              label="Company website"
              placeholder="https://"
              hint="We review it before the call."
            />
            <Field
              label="Invalid state"
              defaultValue="not-an-email"
              error="Enter a valid email address."
            />
            <Field label="Disabled" placeholder="Read-only" disabled />
            <div className="sm:col-span-2">
              <FieldGroup label="Project scope" description="Pick the closest match.">
                <div className="gap-3 flex flex-wrap">
                  <label className="min-h-11 gap-2 text-sm flex items-center">
                    <input type="radio" name="scope-ds" defaultChecked /> New build
                  </label>
                  <label className="min-h-11 gap-2 text-sm flex items-center">
                    <input type="radio" name="scope-ds" /> Rebuild
                  </label>
                  <label className="min-h-11 gap-2 text-sm flex items-center">
                    <input type="radio" name="scope-ds" /> Not sure yet
                  </label>
                </div>
              </FieldGroup>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ds-message" className="text-sm font-medium text-text">
                Project notes
              </label>
              <Textarea id="ds-message" className="mt-1.5" placeholder="What are you building?" />
            </div>
          </div>
        </Section>

        <Section title="Cards, badges & alerts">
          <div className="gap-5 md:grid-cols-3 grid">
            <Card>
              <CardHeader>
                <CardTitle>Default card</CardTitle>
                <CardDescription>Quiet surface for standard content.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">Body copy inside the card.</p>
              </CardContent>
            </Card>
            <Card tone="interactive">
              <CardHeader>
                <CardTitle>Interactive</CardTitle>
                <CardDescription>Lifts and brightens on hover.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="gap-2 flex flex-wrap">
                  <Badge>Neutral</Badge>
                  <Badge tone="accent">Accent</Badge>
                  <Badge tone="success">Success</Badge>
                  <Badge tone="warning">Warning</Badge>
                  <Badge tone="danger">Danger</Badge>
                  <Badge tone="info">Info</Badge>
                </div>
              </CardContent>
            </Card>
            <Card tone="inverted">
              <CardHeader>
                <CardTitle>Inverted</CardTitle>
                <CardDescription className="opacity-80">
                  For high-emphasis sections like final CTAs.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          <div className="mt-5 max-w-2xl gap-3 flex flex-col">
            <Alert tone="info" role="status" title="Heads up">
              Estimates from the project estimator are preliminary, not quotes.
            </Alert>
            <Alert tone="success" role="status" title="Message sent">
              We reply within one business day.
            </Alert>
            <Alert tone="warning" role="status" title="Check your details">
              Two fields need attention before submission.
            </Alert>
            <Alert tone="danger" role="status" title="Submission failed">
              Something went wrong on our side — please retry.
            </Alert>
          </div>
        </Section>

        <Section title="Overlay & navigation primitives">
          <div className="gap-3 flex flex-wrap items-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Open dialog</Button>
              </DialogTrigger>
              <DialogContent
                title="Start a project"
                description="A focused conversation beats a long form."
              >
                <p className="text-sm text-text-secondary">
                  Dialogs trap focus, close on Escape, and animate on transform/opacity only.
                </p>
              </DialogContent>
            </Dialog>

            <Dropdown>
              <DropdownTrigger asChild>
                <Button variant="secondary">Dropdown</Button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownLabel>Actions</DropdownLabel>
                <DropdownItem>View proposal</DropdownItem>
                <DropdownItem>Download invoice</DropdownItem>
                <DropdownSeparator />
                <DropdownItem destructive>Delete draft</DropdownItem>
              </DropdownContent>
            </Dropdown>

            <Tabs defaultValue="web">
              <TabsList
                items={[
                  { value: "web", label: "Web" },
                  { value: "mobile", label: "Mobile" },
                  { value: "growth", label: "Growth" },
                ]}
              />
              <TabsContent value="web">
                <p className="mt-3 text-sm text-text-secondary">
                  Next.js, TypeScript, Tailwind CSS, Motion.
                </p>
              </TabsContent>
              <TabsContent value="mobile">
                <p className="mt-3 text-sm text-text-secondary">
                  React Native + Expo for Android and iOS.
                </p>
              </TabsContent>
              <TabsContent value="growth">
                <p className="mt-3 text-sm text-text-secondary">
                  Email automation and paid media, measured to revenue.
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </Section>

        <Section title="Loading, empty & error states">
          <div className="gap-5 md:grid-cols-3 grid">
            <Card>
              <CardContent>
                <LoadingState label="Loading projects…" />
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <EmptyState
                  icon={Inbox}
                  title="No messages yet"
                  description="When your team replies, conversations appear here."
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <ErrorState
                  title="Couldn't load files"
                  action={
                    <Button size="sm" variant="secondary">
                      Retry
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          </div>
          <div className="mt-5 max-w-sm gap-2 flex flex-col">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Section>

        <Section title="Motion">
          <div className="max-w-xl">
            <p className="text-sm text-text-secondary">
              Animations run on <code className="text-xs font-mono">opacity</code> and{" "}
              <code className="text-xs font-mono">transform</code> only, respect{" "}
              <code className="text-xs font-mono">prefers-reduced-motion</code> globally, and cap at
              0.5s. Scroll this page to see section reveals; the service cards above stagger in on
              scroll; the header underline is a shared layout animation.
            </p>
            <Alert tone="info" role="status" title="Verify reduced motion" className="mt-4">
              Enable &quot;Reduce motion&quot; in your OS settings — entrances collapse to fades.
            </Alert>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={slugify(title)} className="scroll-mt-24">
      <h2
        id={slugify(title)}
        className="text-xs font-semibold tracking-[0.14em] text-text-muted uppercase"
      >
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function Swatches({ rows }: { rows: string[][] }) {
  return (
    <div className="gap-4 flex flex-col">
      {rows.map(([label, ...cells]) => (
        <div key={label} className="gap-2 flex flex-col">
          <p className="text-xs font-mono text-text-muted">{label}</p>
          <div className="gap-2 sm:grid-cols-4 grid grid-cols-2">
            {cells.map((cell, index) => (
              <div key={`${cell}-${index}`} className={cnCell(cell)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function cnCell(cell: string): string {
  return `${cell} h-12 rounded-lg border border-border-subtle`;
}
