import { cn, focusRing } from "@ibtatech/utils";
import { ChevronDown } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * FAQ accordion built on native <details>/<summary>: keyboard-operable and
 * screen-reader friendly with zero JavaScript. First item open by default.
 */
export function FaqAccordion({ items, className }: { items: FaqItem[]; className?: string }) {
  return (
    <div className={cn("divide-y divide-border-subtle border-y border-border-subtle", className)}>
      {items.map((item, index) => (
        <details key={item.question} id={`faq-item-${index}`} className="group" open={index === 0}>
          <summary
            aria-controls={`faq-answer-${index}`}
            className={cn(
              "gap-4 py-5 font-medium flex cursor-pointer list-none items-center justify-between text-left text-text transition-colors [&::-webkit-details-marker]:hidden",
              focusRing,
              "-mx-2 px-2 rounded-md",
            )}
          >
            <span className="text-balance">{item.question}</span>
            <ChevronDown
              aria-hidden
              className="size-4 shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <p
            id={`faq-answer-${index}`}
            className="pb-5 pr-8 leading-relaxed text-body text-text-secondary"
          >
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
