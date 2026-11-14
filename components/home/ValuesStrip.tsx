/* Values strip — delivery, payment and returns promises, all numbers from store settings.
   It follows a section that already ends with its own space, so it adds space below only. */

import { Banknote, CreditCard, RotateCcw, Truck } from "lucide-react";

export interface ValueItem {
  icon: "truck" | "cash" | "card" | "returns";
  title: string;
  body: string;
}

const ICONS = { truck: Truck, cash: Banknote, card: CreditCard, returns: RotateCcw };

export function ValuesStrip({ items, label }: { items: ValueItem[]; label: string }) {
  if (!items.length) return null;
  return (
    <section aria-label={label} className="pb-16 md:pb-24">
      <div className="container-x">
        <ul className="grid divide-y divide-border border-y border-border md:grid-cols-3 md:divide-y-0">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <li
                key={item.title}
                className="flex items-start gap-4 py-7 md:flex-col md:gap-5 md:border-s md:border-border md:px-8 md:py-10 md:first:border-s-0 md:first:ps-0 md:last:pe-0"
              >
                <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-text-primary md:mt-0" strokeWidth={1.25} />
                <div className="flex flex-col gap-1">
                  <p className="text-[0.9375rem] font-medium text-pretty text-text-primary">{item.title}</p>
                  <p className="text-[0.8125rem] text-pretty text-text-muted">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
