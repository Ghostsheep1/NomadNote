import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  collapsed?: boolean;
  className?: string;
}

export function BrandMark({ collapsed = false, className }: BrandMarkProps) {
  return (
    <Link href="/" className={cn("group flex min-w-0 items-center gap-2.5", className)} aria-label="NomadNote home">
      <span className="brand-stamp grid h-9 w-9 flex-shrink-0 place-items-center rounded-[0.55rem]">
        <span className="relative grid h-6 w-6 place-items-center rounded-full border-2 border-current">
          <span className="absolute h-7 w-0.5 rotate-45 rounded-full bg-current" />
          <span className="absolute h-7 w-0.5 -rotate-45 rounded-full bg-current" />
          <span className="h-2 w-2 rounded-full bg-current" />
        </span>
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate font-display text-lg font-black leading-none tracking-normal">
            NomadNote
          </span>
          <span className="atlas-label block truncate pt-0.5">Field atlas</span>
        </span>
      )}
    </Link>
  );
}
