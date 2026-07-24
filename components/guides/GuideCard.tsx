import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  difficultyBadgeStyles,
  type GuideMeta,
} from "@/lib/guides";

const difficultyLabel: Record<GuideMeta["difficulty"], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/** Card for the /guides listing grid. The whole card links to the guide. */
export default function GuideCard({ guide }: { guide: GuideMeta }) {
  return (
    <Link
      href={guide.href}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className={cn("capitalize", difficultyBadgeStyles[guide.difficulty])}
        >
          {difficultyLabel[guide.difficulty]}
        </Badge>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {guide.readingTime}
        </span>
      </div>

      <h2 className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
        {guide.title}
      </h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {guide.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {guide.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-muted px-2 py-0.5 font-mono text-[0.7rem] text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        Read guide
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
