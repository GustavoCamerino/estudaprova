import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, MessageSquare, Calendar, Trophy, Upload, Brain, Edit, Trash2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardItemDialog, { DashboardItem } from '@/components/DashboardItemDialog';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [quickActions, setQuickActions] = useState<DashboardItem[]>([
    {
      id: '1',
      title: 'Chat com IA',
      description: 'Converse com a IA para criar flashcards, resumos e quiz',
      icon: 'MessageSquare',
      href: '/chat',
      color: 'bg-blue-500/10 text-blue-600',
      category: 'action'
    },
    {
      id: '2',
      title: 'Upload PDF',
      description: 'Envie seus materiais de estudo',
      icon: 'Upload',
      href: '/pdfs',
      color: 'bg-green-500/10 text-green-600',
      category: 'action'
    },
    {
      id: '3',
      title: 'Planner',
      description: 'Organize seus estudos',
      icon: 'Calendar',
      href: '/planner',
      color: 'bg-purple-500/10 text-purple-600',
      category: 'action'
    },
    {
      id: '4',
      title: 'Gerar Prova',
      description: 'Crie provas com seus PDFs',
      icon: 'Brain',
      href: '/chat?action=prova',
      color: 'bg-orange-500/10 text-orange-600',
      category: 'action'
    }
  ]);

  const [stats, setStats] = useState<DashboardItem[]>([
    { id: '5', title: 'PDFs Enviados', description: 'Total de PDFs', value: '12', icon: 'FileText', href: '', color: '', category: 'stat' },
    { id: '6', title: 'Flashcards Criados', description: 'Total de flashcards', value: '48', icon: 'Brain', href: '', color: '', category: 'stat' },
    { id: '7', title: 'Quizzes Resolvidos', description: 'Total de quizzes', value: '23', icon: 'Trophy', href: '', color: '', category: 'stat' },
    { id: '8', title: 'Horas de Estudo', description: 'Total de horas', value: '67', icon: 'Calendar', href: '', color: '', category: 'stat' }
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DashboardItem | undefined>();

  const handleEditItem = (item: DashboardItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    setQuickActions(prev => prev.filter(item => item.id !== id));
    setStats(prev => prev.filter(item => item.id !== id));
    toast({
      title: "Item removido",
      description: "O item foi removido do dashboard.",
    });
  };

  const handleSaveItem = (itemData: Omit<DashboardItem, 'id'>) => {
    if (editingItem) {
      // Edit existing
      if (itemData.category === 'action') {
        setQuickActions(prev => prev.map(item => 
          item.id === editingItem.id ? { ...item, ...itemData } : item
        ));
      } else {
        setStats(prev => prev.map(item => 
          item.id === editingItem.id ? { ...item, ...itemData } : item
        ));
      }
      toast({
        title: "Item atualizado",
        description: "O item foi atualizado com sucesso.",
      });
    } else {
      // Create new
      const newItem: DashboardItem = {
        id: Date.now().toString(),
        ...itemData
      };
      if (itemData.category === 'action') {
        setQuickActions(prev => [...prev, newItem]);
      } else {
        setStats(prev => [...prev, newItem]);
      }
      toast({
        title: "Item criado",
        description: "Novo item foi adicionado ao dashboard.",
      });
    }
    setEditingItem(undefined);
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      MessageSquare, Upload, Calendar, Brain, FileText, Trophy
    };
    return icons[iconName] || MessageSquare;
  };

  return (
    <div className="space-y-6 relative">
      {/* Background with nature pattern */}
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none z-0"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&h=1080&fit=crop)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/10 rounded-xl p-8 border border-primary/20 backdrop-blur-sm relative z-10">
        <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-3">
          Bem-vindo ao Estuda.AI
        </h1>
        <p className="text-muted-foreground text-lg">
          Sua plataforma de estudos com inteligência artificial
        </p>
      </div>

      {/* Stats Grid */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Estatísticas</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="border-primary hover:bg-primary/10"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = getIconComponent(stat.icon);
            return (
              <Card key={stat.id} className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border-primary/20 hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon className="h-8 w-8 text-muted-foreground" />
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditItem(stat)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(stat.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Ações Rápidas</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="border-primary hover:bg-primary/10"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = getIconComponent(action.icon);
            return (
              <div key={action.id} className="relative group">
                <Link to={action.href}>
                  <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border-primary/20 hover:border-primary/40">
                    <CardHeader className="pb-3">
                      <div className={`w-14 h-14 rounded-xl ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <CardTitle className="text-xl font-display">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      handleEditItem(action);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteItem(action.id);
                    }}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="relative z-10 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border-primary/20">
        <CardHeader>
          <CardTitle className="font-display">Atividade Recente</CardTitle>
          <CardDescription>Suas últimas interações com a plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Flashcards criados de "Matemática Básica"</p>
                <p className="text-xs text-muted-foreground">Há 2 horas</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">PDF "História do Brasil" enviado</p>
                <p className="text-xs text-muted-foreground">Há 1 dia</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Quiz de "Física" completado - 85%</p>
                <p className="text-xs text-muted-foreground">Há 2 dias</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DashboardItemDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingItem(undefined);
        }}
        item={editingItem}
        onSave={handleSaveItem}
      />
    </div>
  );
};

export default Dashboard;