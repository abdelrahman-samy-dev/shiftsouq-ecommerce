import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  href: string;
  viewMoreText: string;
  locale: string;
}

export function SectionHeader({ title, href, viewMoreText, locale }: SectionHeaderProps) {
  const isAr = locale === "ar";
  
  return (
    <div className="flex items-center justify-between mb-8">
      <h2 className="section-title">
        {title}
      </h2>
      <Link 
        href={href}
        className="group flex items-center gap-2 text-sm font-medium text-link"
      >
        <span>{viewMoreText}</span>
        <ArrowRight size={16} className={`transition-transform duration-300 group-hover:translate-x-1 ${isAr ? 'rtl:-scale-x-100 group-hover:-translate-x-1' : ''}`} />
      </Link>
    </div>
  );
}
