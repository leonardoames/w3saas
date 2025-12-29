import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, TaskOrigin, SECTIONS } from "@/hooks/useTasks";

const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200),
  description: z.string().max(1000).optional(),
  section: z.string().min(1, "Seção é obrigatória"),
  priority: z.enum(["Baixa", "Média", "Alta"]).optional(),
  due_date: z.date().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<Task | null>;
  userId: string;
  origin?: TaskOrigin;
  defaultSection?: string;
  editTask?: Task | null;
  isAdmin?: boolean;
}

export function AddTaskDialog({
  open,
  onOpenChange,
  onSubmit,
  userId,
  origin = 'mentorado',
  defaultSection,
  editTask,
  isAdmin = false,
}: AddTaskDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: editTask?.title || "",
      description: editTask?.description || "",
      section: editTask?.section || defaultSection || "",
      priority: editTask?.priority || undefined,
      due_date: editTask?.due_date ? new Date(editTask.due_date) : undefined,
    },
  });

  // Reset form when dialog opens/closes or editTask changes
  useState(() => {
    if (open) {
      form.reset({
        title: editTask?.title || "",
        description: editTask?.description || "",
        section: editTask?.section || defaultSection || "",
        priority: editTask?.priority || undefined,
        due_date: editTask?.due_date ? new Date(editTask.due_date) : undefined,
      });
    }
  });

  const handleSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await onSubmit({
        user_id: userId,
        title: data.title,
        description: data.description || null,
        section: data.section,
        priority: data.priority || null,
        due_date: data.due_date ? format(data.due_date, 'yyyy-MM-dd') : null,
        status: editTask?.status || 'a_fazer',
        origin: editTask?.origin || origin,
        order_index: editTask?.order_index || 999,
      });
      
      form.reset();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const sections = isAdmin ? SECTIONS : ['Personalizado'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editTask ? "Editar Ação" : "Nova Ação"}
          </DialogTitle>
          <DialogDescription>
            {editTask 
              ? "Faça as alterações necessárias na tarefa."
              : "Adicione uma nova ação ao seu plano personalizado."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Configurar pixel do Facebook" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detalhes sobre a tarefa..." 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isAdmin && (
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seção</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma seção" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sections.map(section => (
                          <SelectItem key={section} value={section}>
                            {section}
                          </SelectItem>
                        ))}
                        <SelectItem value="Personalizado">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                        <SelectItem value="Média">Média</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Prazo</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "dd/MM/yyyy") : "Opcional"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : editTask ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
