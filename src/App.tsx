import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { MainLayout } from "./components/layout/MainLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Public pages
import Landing from "./pages/Landing";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Auth from "./pages/Auth";
import AcessoBloqueado from "./pages/AcessoBloqueado";

// App pages
import Dashboard from "./pages/Dashboard";
import Aulas from "./pages/Aulas";
import PlanoAcao from "./pages/PlanoAcao";
import Calculadora from "./pages/Calculadora";
import SimulacaoCenarios from "./pages/SimulacaoCenarios";
import CRMInfluenciadores from "./pages/CRMInfluenciadores";
import IAW3 from "./pages/IAW3";
import Catalogo from "./pages/Catalogo";
import Produtos from "./pages/Produtos";
import CalendarioComercial from "./pages/CalendarioComercial";

// Admin pages
import AdminUsers from "./pages/admin/AdminUsers";
import AdminModules from "./pages/admin/AdminModules";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/sucesso" element={<CheckoutSuccess />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/acesso-bloqueado" element={<AcessoBloqueado />} />

              {/* Protected app routes */}
              <Route
                path="/app/*"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/aulas" element={<Aulas />} />
                        <Route path="/plano-acao" element={<PlanoAcao />} />
                        <Route path="/calculadora" element={<Calculadora />} />
                        <Route path="/simulacao" element={<SimulacaoCenarios />} />
                        <Route path="/crm-influenciadores" element={<CRMInfluenciadores />} />
                        <Route path="/ia-w3" element={<IAW3 />} />
                        <Route path="/catalogo" element={<Catalogo />} />
                        <Route path="/produtos" element={<Produtos />} />
                        <Route path="/calendario" element={<CalendarioComercial />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              {/* Admin routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/modulos"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminModules />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
