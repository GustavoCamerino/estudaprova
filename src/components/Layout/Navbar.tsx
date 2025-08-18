import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Crown,
  CreditCard,
  BookOpen,
  BarChart3,
  Calendar,
  FileText,
  Zap,
  MessageCircle,
  Heart
} from 'lucide-react';

export const Navbar = () => {
  const { user, signOut, subscription } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const isPremium = subscription?.type === 'premium';

  const navigation = [
    { name: 'Início', href: '/', icon: BookOpen },
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3, authRequired: true },
    { name: 'Meus PDFs', href: '/pdfs', icon: FileText, authRequired: true },
    { name: 'Chat AI', href: '/chat', icon: MessageCircle, authRequired: true },
    { name: 'Planner', href: '/planner', icon: Calendar, authRequired: true },
    { name: 'Academia', href: '/academia', icon: Zap, authRequired: true },
    { name: 'Saúde', href: '/saude', icon: Heart, authRequired: true },
    { name: 'Perfil', href: '/profile', icon: Settings, authRequired: true },
    { name: 'Pagamentos', href: '/pagamento', icon: CreditCard },
    { name: 'Planos', href: '/planos', icon: Crown },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleNavigation = (href: string) => {
    navigate(href);
    setIsOpen(false);
  };

  return (
    <nav className="bg-background/95 border-b border-border sticky top-0 z-50 backdrop-blur-sm">
      <div className="container-custom">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 interactive">
            <img
              src="/lovable-uploads/267e357a-dd15-4333-905d-d654654cb8f6.png"
              alt="EstudaProva"
              className="h-14 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              if (item.authRequired && !user) return null;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className="flex items-center space-x-1 text-foreground hover:text-primary transition-colors interactive"
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                {isPremium && (
                  <div className="flex items-center space-x-1 bg-gradient-to-r from-primary to-secondary text-white px-3 py-1 rounded-full text-xs font-medium">
                    <Crown className="w-3 h-3" />
                    <span>Premium</span>
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full interactive">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex flex-col space-y-1 p-2">
                      <p className="text-sm font-medium leading-none">{user.email}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {isPremium ? 'Usuário Premium' : 'Usuário Gratuito'}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleNavigation('/dashboard')}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigation('/profile')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configurações</span>
                    </DropdownMenuItem>
                    {!isPremium && (
                      <DropdownMenuItem onClick={() => handleNavigation('/planos')}>
                        <Crown className="mr-2 h-4 w-4" />
                        <span>Upgrade para Premium</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sair</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => handleNavigation('/auth')} className="interactive">
                  Entrar
                </Button>
                <Button onClick={() => handleNavigation('/auth')} className="interactive">
                  Cadastrar
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="interactive"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-50">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navigation.map((item) => {
                if (item.authRequired && !user) return null;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center space-x-2 text-foreground hover:text-primary block px-3 py-2 rounded-md text-base font-medium interactive"
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {user ? (
                <div className="pt-4 pb-3 border-t border-border">
                  <div className="flex items-center px-3">
                    <div className="flex-shrink-0">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-foreground">{user.email}</div>
                      <div className="text-sm text-muted-foreground">
                        {isPremium ? 'Premium' : 'Gratuito'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 px-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start interactive"
                      onClick={() => handleNavigation('/profile')}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Configurações
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start interactive"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pt-4 pb-3 border-t border-border space-y-2 px-2">
                  <Button
                    variant="ghost"
                    className="w-full interactive"
                    onClick={() => handleNavigation('/auth')}
                  >
                    Entrar
                  </Button>
                  <Button
                    className="w-full interactive"
                    onClick={() => handleNavigation('/auth')}
                  >
                    Cadastrar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};