/* Values strip — delivery, payment and returns promises, all numbers from store settings. */

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
    <section aria-label={label} className="py-16 md:py-24">
      <div className="container-x">
        <ul className="grid divide-y divide-border border-y border-border md:grid-cols-3 md:divide-x md:divide-y-0 rtl:md:divide-x-reverse">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <li key={item.title} className="flex items-start gap-4 py-7 md:flex-col md:gap-5 md:px-8 md:py-10 md:first:ps-0">
                <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-text-primary md:mt-0" strokeWidth={1.25} />
                <div className="flex flex-col gap-1">
                  <p className="text-[0.9375rem] font-medium text-text-primary">{item.title}</p>
                  <p className="text-[0.8125rem] text-text-muted">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
