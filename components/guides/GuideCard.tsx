import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';

export type GuideDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

const difficultyClass: Record<GuideDifficulty, string> = {
  Beginner: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  Intermediate: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  Advanced: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
};

type GuideCardProps = {
  title: string;
  description: string;
  href: string;
  time: string;
  difficulty: GuideDifficulty;
  tags: string[];
};

export default function GuideCard({ title, description, href, time, difficulty, tags }: GuideCardProps) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl border border-border bg-background p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${difficultyClass[difficulty]}`}>{difficulty}</span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {time}
        </span>
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-foreground group-hover:text-primary">{title}</h2>
      <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
        Read guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
