import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Navbar } from "@/components/Layout/Navbar";
import AuthenticatedLayout from "@/components/Layout/AuthenticatedLayout";
import { LandingPage } from "./pages/LandingPage";
import { AuthPage } from "./pages/AuthPage";
import { AuthConfirmedPage } from "./pages/AuthConfirmedPage";
import { PendingApproval } from "./pages/PendingApproval";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import PDFs from "./pages/PDFs";
import Planner from "./pages/Planner";
import Academia from "./pages/Academia";
import Planos from "./pages/Planos";
import { AdminDashboard } from "./pages/AdminDashboard";
import { Profile } from "./pages/Profile";
import { Pagamento } from "./pages/Pagamento";
import NotFound from "./pages/NotFound";
import PDFTestComponent from './components/PDFTestComponent';
import Saude from "./pages/Saude";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<><Navbar /><LandingPage /></>} />
              <Route path="/auth" element={<><Navbar /><AuthPage /></>} />
              <Route path="/auth-confirmed" element={<><Navbar /><AuthConfirmedPage /></>} />
              <Route path="/pending-approval" element={<PendingApproval />} />
              <Route path="/pagamento" element={<><Navbar /><Pagamento /></>} />
              <Route path="/planos" element={<><Navbar /><Planos /></>} />

              {/* Protected routes */}
              <Route path="/" element={<AuthenticatedLayout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="chat" element={<Chat />} />
                <Route path="pdfs" element={<PDFs />} />
                <Route path="planner" element={<Planner />} />
                <Route path="academia" element={<Academia />} />
                <Route path="saude" element={<Saude />} />
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="teste-pdf" element={<PDFTestComponent />} />
              </Route>

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
