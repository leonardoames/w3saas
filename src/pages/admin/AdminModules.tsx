import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface ModuleAccess {
  id: string;
  user_type: string;
  module_name: string;
  is_enabled: boolean;
}

const MODULES = [
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'simulacao', label: 'Simulação de Cenários' },
  { name: 'calculadora', label: 'Calculadora' },
  { name: 'ia-w3', label: 'IA W3' },
  { name: 'calendario', label: 'Calendário Comercial' },
  { name: 'crm-influenciadores', label: 'CRM Influenciadores' },
  { name: 'aulas', label: 'Aulas da Mentoria' },
  { name: 'plano-acao', label: 'Plano de Ação' },
];

const USER_TYPES = [
  { type: 'mentorado', label: 'Mentorados', description: 'Usuários marcados como mentorado' },
  { type: 'w3_client', label: 'Clientes W3', description: 'Usuários marcados como cliente W3' },
  { type: 'subscriber', label: 'Assinantes', description: 'Usuários com plano pago regular' },
];

export default function AdminModules() {
  const [moduleAccess, setModuleAccess] = useState<ModuleAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchModuleAccess();
  }, []);

  const fetchModuleAccess = async () => {
    try {
      const { data, error } = await supabase
        .from('module_access')
        .select('*')
        .order('user_type');

      if (error) throw error;

      setModuleAccess(data || []);
    } catch (error) {
      console.error('Error fetching module access:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isModuleEnabled = (userType: string, moduleName: string): boolean => {
    const access = moduleAccess.find(
      a => a.user_type === userType && a.module_name === moduleName
    );
    return access?.is_enabled ?? false;
  };

  const toggleModule = (userType: string, moduleName: string) => {
    const existingAccess = moduleAccess.find(
      a => a.user_type === userType && a.module_name === moduleName
    );

    if (existingAccess) {
      setModuleAccess(moduleAccess.map(a =>
        a.id === existingAccess.id
          ? { ...a, is_enabled: !a.is_enabled }
          : a
      ));
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    
    try {
      // Update all module access records
      for (const access of moduleAccess) {
        const { error } = await supabase
          .from('module_access')
          .update({ is_enabled: access.is_enabled })
          .eq('id', access.id);

        if (error) throw error;
      }

      toast({
        title: "Salvo",
        description: "As configurações de módulos foram atualizadas.",
      });
    } catch (error) {
      console.error('Error saving module access:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Configuração de Módulos</h2>
            <p className="text-muted-foreground">
              Defina quais módulos cada tipo de usuário pode acessar
            </p>
          </div>
          <Button onClick={saveChanges} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar alterações
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-6">
          {USER_TYPES.map((userType) => (
            <Card key={userType.type}>
              <CardHeader>
                <CardTitle>{userType.label}</CardTitle>
                <CardDescription>{userType.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {MODULES.map((module) => (
                    <div
                      key={`${userType.type}-${module.name}`}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`${userType.type}-${module.name}`}
                        checked={isModuleEnabled(userType.type, module.name)}
                        onCheckedChange={() => toggleModule(userType.type, module.name)}
                      />
                      <label
                        htmlFor={`${userType.type}-${module.name}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {module.label}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
