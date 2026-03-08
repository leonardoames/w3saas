export const TYPE_OPTIONS = [
  { value: "criativo_pago", label: "Criativo Pago" },
  { value: "organico", label: "Orgânico" },
  { value: "ambos", label: "Ambos" },
];

export const FORMAT_OPTIONS = [
  { value: "video_curto", label: "Vídeo Curto" },
  { value: "carrossel", label: "Carrossel" },
  { value: "imagem_estatica", label: "Imagem Estática" },
  { value: "post_blog", label: "Post Blog" },
  { value: "stories", label: "Stories" },
  { value: "influenciador", label: "Influenciador" },
  { value: "video_longo", label: "Vídeo Longo" },
];

export const CHANNEL_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "outro", label: "Outro" },
];

export const OBJECTIVE_OPTIONS = [
  { value: "vendas_normal", label: "Vendas Normal" },
  { value: "acao_promocional", label: "Ação/Promoção Temporária" },
  { value: "liveshop", label: "Liveshop" },
  { value: "branding", label: "Branding" },
  { value: "remarketing", label: "Remarketing" },
];

export const PRIORITY_OPTIONS = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

export const STATUS_OPTIONS = [
  { value: "ideia", label: "Ideia" },
  { value: "em_producao", label: "Em Produção" },
  { value: "aprovacao", label: "Aprovação" },
  { value: "agendado", label: "Agendado" },
  { value: "publicado", label: "Publicado" },
  { value: "arquivado", label: "Arquivado" },
];

export const TYPE_COLORS: Record<string, string> = {
  criativo_pago: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  organico: "bg-green-500/10 text-green-400 border-green-500/20",
  ambos: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export const PRIORITY_COLORS: Record<string, string> = {
  alta: "bg-red-500/10 text-red-400 border-red-500/20",
  media: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  baixa: "bg-muted text-muted-foreground border-border",
};

export const STATUS_COLORS: Record<string, string> = {
  ideia: "bg-muted text-muted-foreground border-border",
  em_producao: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  aprovacao: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  agendado: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  publicado: "bg-green-500/10 text-green-400 border-green-500/20",
  arquivado: "bg-zinc-700/30 text-zinc-500 border-zinc-600/20",
};

export const PRIORITY_BORDER: Record<string, string> = {
  alta: "border-l-red-500",
  media: "border-l-yellow-500",
  baixa: "border-l-zinc-600",
};

export const getLabel = (options: { value: string; label: string }[], value: string) =>
  options.find((o) => o.value === value)?.label || value;
