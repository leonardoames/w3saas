import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Lock, Play, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DEFAULT_COVER = "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=708&h=1494&fit=crop&auto=format&q=80";

interface ModuleCardProps {
  id: string;
  title: string;
  coverUrl?: string | null;
  completedCount: number;
  totalLessons: number;
  isAdmin?: boolean;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ModuleCard({
  title,
  coverUrl,
  completedCount,
  totalLessons,
  isAdmin,
  onClick,
  onEdit,
  onDelete,
}: ModuleCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const progress = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;
  const isCompleted = totalLessons > 0 && completedCount === totalLessons;
  const src = coverUrl || DEFAULT_COVER;

  return (
    <div
      className="group relative cursor-pointer flex-shrink-0 transition-transform duration-300 hover:scale-105"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      {/* Card wrapper — 9:19 aspect ratio */}
      <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: "708/1494" }}>
        {/* Skeleton while loading */}
        {!imgLoaded && (
          <Skeleton className="absolute inset-0 rounded-xl" />
        )}

        {/* Cover image */}
        <img
          src={src}
          alt={title}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            imgLoaded ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Dark overlay for text readability — 30% */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Completed badge */}
        {isCompleted && (
          <div className="absolute top-2 right-2 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground uppercase tracking-wide">
            Concluído
          </div>
        )}

        {/* Admin actions */}
        {isAdmin && (
          <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-black/50 text-white hover:bg-black/70 hover:text-white"
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-black/50 text-white hover:bg-destructive hover:text-white"
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Hover overlay with "Continuar" */}
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <div className="rounded-full bg-primary p-3 shadow-lg">
            <Play className="h-6 w-6 text-primary-foreground fill-primary-foreground" />
          </div>
          <span className="mt-2 text-sm font-semibold text-white">
            {completedCount > 0 && completedCount < totalLessons ? "Continuar aula" : "Assistir"}
          </span>
          <span className="text-xs text-white/80 mt-0.5">
            {progress.toFixed(0)}% concluído
          </span>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
          <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">{title}</h3>
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-1 flex-1 bg-white/30" />
            <span className="text-[10px] font-medium text-white/80 tabular-nums">
              {completedCount}/{totalLessons}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModuleCardSkeleton() {
  return (
    <div className="flex-shrink-0">
      <Skeleton className="rounded-xl w-full" style={{ aspectRatio: "708/1494" }} />
    </div>
  );
}
