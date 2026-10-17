import Link from "next/link";
import { ArrowRight, Code } from "lucide-react";
import {
  CARD_GAP,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  SECTION_GAP,
  StaggerGroup,
  StaggerItem,
  cn,
} from "@ibtatech/ui";
import { SERVICES, serviceHref } from "@ibtatech/config";
import { SERVICE_ICONS } from "@/components/service-icons";

export function ServiceCards({ copy }: { copy: "tagline" | "subheadline" }) {
  return (
    <StaggerGroup className={cn(SECTION_GAP, CARD_GAP, "sm:grid-cols-2 grid")}>
      {SERVICES.map((service) => {
        const Icon = SERVICE_ICONS[service.slug] ?? Code;
        const description = copy === "tagline" ? service.tagline : service.subheadline;

        return (
          <StaggerItem key={service.slug} className="h-full">
            <Card
              tone="interactive"
              className="group relative flex h-full flex-col focus-within:border-border-strong focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-2 focus-within:ring-offset-surface"
            >
              <CardHeader>
                <div className="gap-3 flex items-center">
                  <span className="size-10 flex shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon aria-hidden className="size-5" strokeWidth={2} />
                  </span>
                  <CardTitle className="min-w-0">
                    <Link
                      href={serviceHref(service.slug)}
                      aria-label={`Explore ${service.name}`}
                      className="after:inset-0 after:absolute after:z-10 after:rounded-xl focus-visible:outline-none"
                    >
                      {service.name}
                    </Link>
                  </CardTitle>
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-5 mt-auto justify-between">
                <div className="gap-2 min-w-0 pr-3 flex flex-wrap">
                  {service.capabilities.slice(0, 2).map((capability) => (
                    <span
                      key={capability.title}
                      className="px-2 py-1 text-xs font-medium rounded-full border border-border-subtle bg-surface-sunken text-text-secondary"
                    >
                      {capability.title}
                    </span>
                  ))}
                </div>
                <span
                  aria-hidden="true"
                  className="size-11 gap-2 motion-safe:group-hover:translate-x-1 motion-safe:group-focus-within:translate-x-1 flex shrink-0 items-center justify-center rounded-full border border-border-default bg-surface text-text-muted transition-colors duration-200 group-hover:border-border-strong group-hover:text-accent motion-reduce:transition-none"
                >
                  <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              </CardFooter>
            </Card>
          </StaggerItem>
        );
      })}
    </StaggerGroup>
  );
}
