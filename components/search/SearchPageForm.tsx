"use client";

/* Search box on /search: a plain GET form (works without JavaScript); with JavaScript it navigates client-side and remembers the search. */

import Form from "next/form";
import { useState } from "react";
import { Search } from "lucide-react";
import type { Locale } from "@/lib/types";
import { discoveryCopy } from "@/lib/search/copy";
import { saveRecentSearch } from "./recent-searches";

export function SearchPageForm({ locale, initialQuery }: { locale: Locale; initialQuery: string }) {
  const copy = discoveryCopy(locale);
  const [value, setValue] = useState(initialQuery);

  return (
    <Form action="/search" role="search" onSubmit={() => saveRecentSearch(value)} className="mt-8 max-w-3xl md:mt-10">
      <label htmlFor="search-page-input" className="sr-only">
        {copy.searchLabel}
      </label>
      <div className="flex h-14 items-center gap-3 border-b border-border-hover transition-colors focus-within:border-text-primary md:h-16">
        <Search aria-hidden="true" className="size-5 shrink-0 text-text-muted" strokeWidth={1.5} />
        <input
          id="search-page-input"
          name="q"
          type="search"
          required
          maxLength={60}
          autoComplete="off"
          enterKeyHint="search"
          placeholder={copy.searchPlaceholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent text-lg text-text-primary outline-none placeholder:text-text-faint [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center px-2 text-sm font-medium text-text-primary underline-offset-4 hover:underline"
        >
          {copy.submitSearch}
        </button>
      </div>
    </Form>
  );
}
