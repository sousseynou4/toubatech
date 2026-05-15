import { Plus } from 'lucide-react';
import type { FAQItem } from './data';

/**
 * Native HTML5 <details> accordion.
 * Works without JavaScript, fully keyboard-accessible by default,
 * read correctly by screen readers.
 * No external dependencies.
 */
export function FAQAccordion({ items }: { items: FAQItem[] }) {
  return (
    <div className="divide-y divide-ink/8 overflow-hidden rounded-3xl border border-ink/10 bg-bone">
      {items.map((item, index) => (
        <details key={index} className="group">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 px-6 py-5 transition-colors hover:bg-mist/40 md:px-8 md:py-6">
            <h3 className="text-[16px] font-medium tracking-tight text-ink md:text-[17px]">
              {item.question}
            </h3>
            <span
              className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-ink/10 bg-bone text-ink-500 transition-all group-open:rotate-45 group-open:border-emerald group-open:bg-emerald group-open:text-bone"
              aria-hidden="true"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
            </span>
          </summary>
          <div className="px-6 pb-6 md:px-8 md:pb-7">
            <p className="max-w-3xl text-[15px] leading-relaxed text-ink-500">
              {item.answer}
            </p>
          </div>
        </details>
      ))}
    </div>
  );
}
