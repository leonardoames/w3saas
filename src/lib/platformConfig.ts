export type PlatformType = 'todos' | 'shopee' | 'amazon' | 'mercado_livre' | 'shein' | 'shopify' | 'nuvemshop' | 'tray' | 'loja_integrada' | 'olist_tiny' | 'outros';

export interface PlatformConfig {
  id: PlatformType;
  label: string;
  color: string;
}

export const PLATFORMS_LIST: PlatformConfig[] = [
  { id: 'todos', label: 'Todos os canais', color: 'bg-primary' },
  { id: 'shopee', label: 'Shopee', color: 'bg-orange-500' },
  { id: 'amazon', label: 'Amazon', color: 'bg-slate-700' },
  { id: 'mercado_livre', label: 'Mercado Livre', color: 'bg-yellow-500' },
  { id: 'shein', label: 'Shein', color: 'bg-zinc-800' },
  { id: 'shopify', label: 'Shopify', color: 'bg-green-600' },
  { id: 'nuvemshop', label: 'Nuvemshop', color: 'bg-blue-600' },
  { id: 'tray', label: 'Tray', color: 'bg-emerald-600' },
  { id: 'loja_integrada', label: 'Loja Integrada', color: 'bg-purple-600' },
  { id: 'olist_tiny', label: 'Olist Tiny', color: 'bg-indigo-600' },
  { id: 'outros', label: 'Outros', color: 'bg-muted-foreground' },
];

export const getPlatformConfig = (platformId: string): PlatformConfig => {
  return PLATFORMS_LIST.find(p => p.id === platformId) || PLATFORMS_LIST[PLATFORMS_LIST.length - 1];
};
