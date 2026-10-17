"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Button, Field, FieldSelect } from "@ibtatech/ui";
import { sourceOptions, statusOptions } from "@/lib/admin/labels";

export function LeadsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const apply = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      if (!("page" in updates)) params.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <form
      className="gap-3 lg:flex-row lg:items-end flex flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        apply({
          q: String(data.get("q") ?? "").trim(),
          status: String(data.get("status") ?? ""),
          source: String(data.get("source") ?? ""),
          sort: String(data.get("sort") ?? "newest"),
        });
      }}
    >
      <Field
        label="Search"
        name="q"
        type="search"
        placeholder="Name, email, or company"
        defaultValue={searchParams.get("q") ?? ""}
        containerClassName="flex-1 min-w-0"
        autoComplete="off"
      />
      <FieldSelect
        label="Status"
        name="status"
        options={statusOptions(true)}
        defaultValue={searchParams.get("status") ?? ""}
        containerClassName="w-full lg:w-40"
      />
      <FieldSelect
        label="Source"
        name="source"
        options={sourceOptions(true)}
        defaultValue={searchParams.get("source") ?? ""}
        containerClassName="w-full lg:w-44"
      />
      <FieldSelect
        label="Sort"
        name="sort"
        options={[
          { value: "newest", label: "Newest first" },
          { value: "oldest", label: "Oldest first" },
        ]}
        defaultValue={searchParams.get("sort") ?? "newest"}
        containerClassName="w-full lg:w-40"
      />
      <div className="gap-2 flex">
        <Button type="submit" loading={pending} className="shrink-0">
          Apply
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={pending}
          onClick={() => {
            startTransition(() => {
              router.replace(pathname, { scroll: false });
            });
          }}
        >
          Clear
        </Button>
      </div>
    </form>
  );
}

/** Hidden inputs preserving filters across page links. */
export function useFilterQuery() {
  const searchParams = useSearchParams();
  const keys = ["q", "status", "source", "sort"] as const;
  const pairs: Array<[string, string]> = [];
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value) pairs.push([key, value]);
  }
  return pairs;
}

export function PageLink({
  page,
  disabled,
  children,
}: {
  page: number;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const pairs = useFilterQuery();
  const params = new URLSearchParams([...pairs, ["page", String(page)]]);
  if (disabled) {
    return (
      <span
        aria-disabled
        className="h-11 min-w-11 px-3 text-sm inline-flex items-center justify-center rounded-md border border-border-default text-text-muted opacity-50"
      >
        {children}
      </span>
    );
  }
  return (
    <a
      href={`?${params.toString()}`}
      className="h-11 min-w-11 px-3 text-sm inline-flex items-center justify-center rounded-md border border-border-default text-text hover:bg-surface-sunken"
    >
      {children}
    </a>
  );
}
