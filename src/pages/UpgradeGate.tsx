import { useParams, useNavigate } from "react-router-dom";
import { GraduationCap, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURE_LABELS: Record<string, string> = {
  "w3-educacao": "W3 Educação",
  "mentoria-ames": "Mentoria AMES",
  "tutorias": "Tutorias",
  "hotseats": "Hotseats com Léo",
};

export default function UpgradeGate() {
  const { feature } = useParams<{ feature: string }>();
  const navigate = useNavigate();
  const featureLabel = FEATURE_LABELS[feature ?? ""] ?? "este módulo";

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-9 w-9 text-primary" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-bold">Acesso bloqueado</h1>
        <p className="text-muted-foreground">
          <strong>{featureLabel}</strong> é exclusivo para clientes da{" "}
          <strong>Mentoria AMES</strong>. Faça o upgrade para desbloquear este conteúdo.
        </p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-3 max-w-sm w-full">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-5 w-5 text-primary shrink-0" />
          <span className="text-sm font-medium">Mentoria AMES inclui:</span>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1.5 text-left pl-8">
          <li>• Aulas e tutoriais exclusivos</li>
          <li>• Hotseats ao vivo com Léo</li>
          <li>• Calendário Comercial</li>
          <li>• Acompanhamento personalizado</li>
        </ul>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button size="sm" onClick={() => navigate("/app/produtos")}>
          Conhecer a Mentoria AMES
        </Button>
      </div>
    </div>
  );
}
