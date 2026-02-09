"use client";

import { cn } from "@/lib/utils";

export type ExpenseTag = 'tax-deductible' | 'emergency' | 'recurring' | 'reimbursable' | string;

interface ExpenseTagsProps {
  tags: string[];
  className?: string;
}

function getTagColor(tag: string): string {
  switch (tag.toLowerCase()) {
    case 'tax-deductible':
      return 'bg-green-500/10 text-green-700 border-green-500/20';
    case 'emergency':
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    case 'recurring':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    case 'reimbursable':
      return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  }
}

export function ExpenseTags({ tags, className }: ExpenseTagsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border",
            getTagColor(tag)
          )}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function ExpenseTagPill({ tag }: { tag: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border",
        getTagColor(tag)
      )}
    >
      {tag}
    </span>
  );
}
