import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Home,
  FileText,
  Calendar,
  CreditCard,
  MessageSquare,
  LogOut,
  User,
  Sun,
  Moon,
  Settings,
  Shield,
  Heart
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

const AuthenticatedLayout = () => {
  const { user, signOut, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useUserRole();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/chat', icon: MessageSquare, label: 'Chat AI' },
    { href: '/pdfs', icon: FileText, label: 'Meus PDFs' },
    { href: '/planner', icon: Calendar, label: 'Planner' },
    { href: '/saude', icon: Heart, label: 'Saúde' },
    { href: '/planos', icon: CreditCard, label: 'Planos' },
    { href: '/profile', icon: Settings, label: 'Perfil' },
    ...(isAdmin ? [{ href: '/admin', icon: Shield, label: 'Admin' }] : []),
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background with nature elements */}
      <div
        className="fixed inset-0 opacity-3 pointer-events-none z-0"
        style={{
          backgroundImage: theme === 'dark'
            ? `url(https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&h=1080&fit=crop)` // Cerrado starry night
            : `url(https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1920&h=1080&fit=crop)`, // Cerrado day
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/95 z-0" />

      {/* Header */}
      <header className="border-b bg-card/70 backdrop-blur-lg sticky top-0 z-50 relative">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile menu */}
              <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72">
                    <nav className="mt-6 space-y-2">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              }`}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </nav>
                  </SheetContent>
                </Sheet>
              </div>
              <Link to="/dashboard" className="flex items-center">
                <img
                  src="/lovable-uploads/267e357a-dd15-4333-905d-d654654cb8f6.png"
                  alt="EstudaProva"
                  className="h-14 w-auto"
                />
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="hover:bg-primary/10"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              <Link to="/profile" className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative z-10">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 min-h-[calc(100vh-73px)] bg-card/40 backdrop-blur-lg border-r border-primary/20">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AuthenticatedLayout;