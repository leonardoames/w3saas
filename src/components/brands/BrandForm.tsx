import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const brandSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  short_description: z
    .string()
    .min(10, "Descrição deve ter pelo menos 10 caracteres")
    .max(200, "Descrição deve ter no máximo 200 caracteres"),
  long_description: z.string().max(1000).optional(),
  category: z.string().min(1, "Selecione uma categoria"),
  website_url: z.string().url("URL inválida").max(500),
  instagram_url: z.string().url("URL inválida").max(500).optional().or(z.literal("")),
  facebook_url: z.string().url("URL inválida").max(500).optional().or(z.literal("")),
  logo_url: z.string().url("URL inválida").max(500).optional().or(z.literal("")),
});

type BrandFormData = z.infer<typeof brandSchema>;

const CATEGORIES = [
  "Moda",
  "Acessórios",
  "Beleza",
  "Casa & Decoração",
  "Eletrônicos",
  "Alimentos & Bebidas",
  "Saúde & Bem-estar",
  "Esportes",
  "Pet",
  "Infantil",
  "Outros",
];

interface BrandFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BrandForm({ open, onOpenChange, onSuccess }: BrandFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: "",
      short_description: "",
      long_description: "",
      category: "",
      website_url: "",
      instagram_url: "",
      facebook_url: "",
      logo_url: "",
    },
  });

  const onSubmit = async (data: BrandFormData) => {
    try {
      setIsSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para adicionar uma marca.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("brands").insert({
        user_id: user.id,
        name: data.name,
        short_description: data.short_description,
        long_description: data.long_description || null,
        category: data.category,
        website_url: data.website_url,
        instagram_url: data.instagram_url || null,
        facebook_url: data.facebook_url || null,
        logo_url: data.logo_url || null,
        status: "pending",
        is_active: false,
      });

      if (error) throw error;

      toast({
        title: "Marca enviada!",
        description: "Sua marca foi enviada para aprovação.",
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error submitting brand:", error);
      toast({
        title: "Erro ao enviar marca",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Marca</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Marca *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Minha Loja" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="short_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Curta *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Uma breve descrição da sua marca (máx. 200 caracteres)"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="long_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Longa</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Conte mais sobre sua marca (opcional)"
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Site *</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.sualoja.com.br" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Logo</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instagram_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram</FormLabel>
                  <FormControl>
                    <Input placeholder="https://instagram.com/sualoja" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="facebook_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facebook</FormLabel>
                  <FormControl>
                    <Input placeholder="https://facebook.com/sualoja" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar para Aprovação
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
