import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORMS_LIST, PlatformType } from "@/lib/platformConfig";

interface PlatformSelectProps {
  value: string;
  onValueChange: (value: PlatformType) => void;
  className?: string;
}

export function PlatformSelect({ value, onValueChange, className }: PlatformSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as PlatformType)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Plataforma" />
      </SelectTrigger>
      <SelectContent>
        {PLATFORMS_LIST.map((platform) => (
          <SelectItem key={platform.id} value={platform.id}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${platform.color}`} />
              {platform.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
