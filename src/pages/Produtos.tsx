import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, MessageCircle } from "lucide-react";

// Mock data - será substituído por dados reais depois
const products = [
  {
    id: 1,
    name: "Mentoria Ames",
    description: "Programa completo de mentoria para escalar seu e-commerce",
    image: "https://placehold.co/400x300/0066CC/white?text=Mentoria",
    detailsUrl: "#",
    whatsappUrl: "https://wa.me/5511999999999",
  },
  {
    id: 2,
    name: "Consultoria Estratégica",
    description: "Análise profunda e plano personalizado para seu negócio",
    image: "https://placehold.co/400x300/00AA88/white?text=Consultoria",
    detailsUrl: "#",
    whatsappUrl: "https://wa.me/5511999999999",
  },
  {
    id: 3,
    name: "Evento Presencial",
    description: "Imersão exclusiva com networking e conteúdo avançado",
    image: "https://placehold.co/400x300/0066CC/white?text=Evento",
    detailsUrl: "#",
    whatsappUrl: "https://wa.me/5511999999999",
  },
  {
    id: 4,
    name: "Treinamento Avançado",
    description: "Curso intensivo sobre tráfego pago e conversão",
    image: "https://placehold.co/400x300/00AA88/white?text=Treinamento",
    detailsUrl: "#",
    whatsappUrl: "https://wa.me/5511999999999",
  },
];

export default function Produtos() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Produtos da Mentoria</h1>
        <p className="mt-2 text-muted-foreground">
          Conheça outros produtos e serviços da AMH e W3 Tráfego Pago
        </p>
      </div>

      {/* Products Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <div className="aspect-video overflow-hidden bg-muted">
              <img 
                src={product.image} 
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-xl">{product.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{product.description}</p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" asChild className="flex-1">
                  <a href={product.detailsUrl}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Saiba Mais
                  </a>
                </Button>
                <Button asChild className="flex-1">
                  <a href={product.whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Falar com Especialista
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
