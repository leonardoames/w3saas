import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Instagram, Facebook } from "lucide-react";

// Mock data - será substituído por dados reais do banco depois
const brands = [
  {
    id: 1,
    name: "Marca Exemplo 1",
    logo: "https://placehold.co/100x100/0066CC/white?text=M1",
    shortDescription: "E-commerce de moda feminina sustentável",
    category: "Moda",
    website: "https://exemplo1.com",
    instagram: "https://instagram.com/exemplo1",
  },
  {
    id: 2,
    name: "Marca Exemplo 2",
    logo: "https://placehold.co/100x100/00AA88/white?text=M2",
    shortDescription: "Suplementos e produtos naturais",
    category: "Saúde",
    website: "https://exemplo2.com",
    instagram: "https://instagram.com/exemplo2",
  },
  {
    id: 3,
    name: "Marca Exemplo 3",
    logo: "https://placehold.co/100x100/0066CC/white?text=M3",
    shortDescription: "Eletrônicos e acessórios tech",
    category: "Tecnologia",
    website: "https://exemplo3.com",
    facebook: "https://facebook.com/exemplo3",
  },
];

export default function Catalogo() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Catálogo de Marcas</h1>
        <p className="mt-2 text-muted-foreground">
          Conheça as marcas dos nossos mentorados e apoie outros empreendedores
        </p>
      </div>

      {/* Brands Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => (
          <Card key={brand.id} className="overflow-hidden">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-muted">
                <img 
                  src={brand.logo} 
                  alt={`Logo ${brand.name}`}
                  className="h-full w-full object-cover"
                />
              </div>
              <CardTitle className="text-xl">{brand.name}</CardTitle>
              <div className="mt-2">
                <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {brand.category}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                {brand.shortDescription}
              </p>

              <div className="flex flex-col gap-2">
                <Button asChild className="w-full">
                  <a href={brand.website} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Visitar Loja
                  </a>
                </Button>

                <div className="flex gap-2">
                  {brand.instagram && (
                    <Button variant="outline" size="icon" asChild className="flex-1">
                      <a href={brand.instagram} target="_blank" rel="noopener noreferrer">
                        <Instagram className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {brand.facebook && (
                    <Button variant="outline" size="icon" asChild className="flex-1">
                      <a href={brand.facebook} target="_blank" rel="noopener noreferrer">
                        <Facebook className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {brands.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium text-muted-foreground">
              Nenhuma marca cadastrada ainda
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
