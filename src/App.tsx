import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Aulas from "./pages/Aulas";
import PlanoAcao from "./pages/PlanoAcao";
import Calculadora from "./pages/Calculadora";
import IAW3 from "./pages/IAW3";
import Catalogo from "./pages/Catalogo";
import Produtos from "./pages/Produtos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/aulas" element={<Aulas />} />
            <Route path="/plano-acao" element={<PlanoAcao />} />
            <Route path="/calculadora" element={<Calculadora />} />
            <Route path="/ia-w3" element={<IAW3 />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
