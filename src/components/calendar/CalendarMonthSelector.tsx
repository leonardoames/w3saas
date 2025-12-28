import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface CalendarMonthSelectorProps {
  selectedMonth: number; // 0-indexed
  onMonthChange: (month: number) => void;
}

export function CalendarMonthSelector({ selectedMonth, onMonthChange }: CalendarMonthSelectorProps) {
  const handlePrev = () => {
    if (selectedMonth > 0) {
      onMonthChange(selectedMonth - 1);
    }
  };

  const handleNext = () => {
    if (selectedMonth < 11) {
      onMonthChange(selectedMonth + 1);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrev}
        disabled={selectedMonth === 0}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex gap-1 flex-wrap justify-center">
        {MONTH_NAMES.map((name, index) => (
          <Button
            key={name}
            variant={selectedMonth === index ? "default" : "ghost"}
            size="sm"
            onClick={() => onMonthChange(index)}
            className="text-xs px-2"
          >
            {name.substring(0, 3)}
          </Button>
        ))}
      </div>
      
      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        disabled={selectedMonth === 11}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
