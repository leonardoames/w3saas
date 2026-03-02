import { Heart, ExternalLink, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Brand } from "@/types/brand";

interface BrandCardProps {
  brand: Brand;
  liked: boolean;
  likeCount: number;
  onToggleLike: (brandId: string) => void;
}

function getFaviconUrl(websiteUrl: string | null): string | null {
  if (!websiteUrl) return null;
  try {
    const url = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
  } catch {
    return null;
  }
}

export function BrandCard({ brand, liked, likeCount, onToggleLike }: BrandCardProps) {
  const faviconUrl = getFaviconUrl(brand.website_url);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-[hsl(var(--card-elevated))]">
      {/* Logo */}
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-[10px] bg-muted">
        {brand.logo_url ? (
          <img
            src={brand.logo_url}
            alt={`Logo ${brand.name}`}
            className="h-full w-full object-cover"
          />
        ) : faviconUrl ? (
          <img
            src={faviconUrl}
            alt={`Favicon ${brand.name}`}
            className="h-full w-full object-contain p-2"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        {!brand.logo_url && (
          <div className={`flex h-full w-full items-center justify-center ${faviconUrl ? "hidden" : ""}`}>
            <Store className="h-7 w-7 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-section-title text-foreground truncate">{brand.name}</span>
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/10 text-primary text-[11px] px-2 py-0 font-medium shrink-0"
          >
            {brand.category}
          </Badge>
        </div>
        <p className="text-body text-muted-foreground opacity-70 line-clamp-1">
          {brand.short_description}
        </p>

        {/* Footer */}
        <div className="mt-2 flex items-center justify-between">
          <Button variant="outline" size="sm" asChild className="h-8 text-xs">
            <a href={brand.website_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Visitar Loja
            </a>
          </Button>

          <button
            onClick={() => onToggleLike(brand.id)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                liked ? "fill-red-500 text-red-500" : "text-muted-foreground"
              }`}
            />
            <span className={liked ? "text-red-500" : "text-muted-foreground"}>
              {likeCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
