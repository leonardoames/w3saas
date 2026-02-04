import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, subDays, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface PeriodFilterProps {
  selectedPeriod: string;
  onPeriodChange: (period: string, startDate: Date, endDate: Date) => void;
  customRange: DateRange | undefined;
  onCustomRangeChange: (range: DateRange | undefined) => void;
}

export function PeriodFilter({ 
  selectedPeriod, 
  onPeriodChange, 
  customRange, 
  onCustomRangeChange 
}: PeriodFilterProps) {
  const today = new Date();

  const periods = [
    { label: "7 dias", value: "7d", getRange: () => ({ from: subDays(today, 7), to: today }) },
    { label: "14 dias", value: "14d", getRange: () => ({ from: subDays(today, 14), to: today }) },
    { label: "30 dias", value: "30d", getRange: () => ({ from: subDays(today, 30), to: today }) },
    { label: "Este mês", value: "month", getRange: () => ({ from: startOfMonth(today), to: today }) },
  ];

  const handlePeriodClick = (period: typeof periods[0]) => {
    const range = period.getRange();
    onPeriodChange(period.value, range.from, range.to);
  };

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    onCustomRangeChange(range);
    if (range?.from && range?.to) {
      onPeriodChange("custom", range.from, range.to);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2 flex-wrap">
      {periods.map((period) => (
        <Button
          key={period.value}
          variant={selectedPeriod === period.value ? "default" : "outline"}
          size="sm"
          onClick={() => handlePeriodClick(period)}
          className={cn(
            "text-xs",
            selectedPeriod === period.value && "text-primary-foreground"
          )}
        >
          {period.label}
        </Button>
      ))}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={selectedPeriod === "custom" ? "default" : "outline"}
            size="sm"
            className={cn(
              "text-xs gap-1",
              selectedPeriod === "custom" && "text-primary-foreground",
              !customRange && selectedPeriod !== "custom" && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-3 w-3" />
            {customRange?.from ? (
              customRange.to ? (
                <>
                  {format(customRange.from, "dd/MM", { locale: ptBR })} - {format(customRange.to, "dd/MM", { locale: ptBR })}
                </>
              ) : (
                format(customRange.from, "dd/MM", { locale: ptBR })
              )
            ) : (
              "Personalizado"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={customRange?.from}
            selected={customRange}
            onSelect={handleCustomRangeSelect}
            numberOfMonths={2}
            locale={ptBR}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
