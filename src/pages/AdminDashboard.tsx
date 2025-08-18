import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Activity, TrendingUp, Shield, UserCheck, UserX, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  approved: boolean;
  created_at: string;
}

interface Analytics {
  id: string;
  action: string;
  page: string;
  created_at: string;
  user_id: string;
}

interface ActiveUser {
  user_id: string;
  last_activity: string;
  page_url: string;
  user_agent: string;
}

export const AdminDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    totalActions: 0
  });

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive"
      });
      return;
    }

    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, roleLoading]);

  const loadData = async () => {
    try {
      // Load users with profiles
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          email,
          full_name,
          role,
          approved,
          created_at
        `);

      if (usersError) throw usersError;

      // Load analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('page_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (analyticsError) throw analyticsError;

      // Load active users (last 30 minutes)
      const { data: activeUsersData, error: activeUsersError } = await supabase
        .from('active_users')
        .select(`
          user_id,
          last_activity,
          page_url,
          user_agent
        `)
        .gte('last_activity', new Date(Date.now() - 30 * 60 * 1000).toISOString());

      if (activeUsersError) throw activeUsersError;

      // Process data
      const today = new Date().toISOString().split('T')[0];
      const newUsersToday = usersData?.filter(u => 
        u.created_at.startsWith(today)
      ).length || 0;

      setUsers(usersData || []);
      setAnalytics(analyticsData || []);
      setActiveUsers(activeUsersData || []);
      setStats({
        totalUsers: usersData?.length || 0,
        activeUsers: activeUsersData?.length || 0,
        newUsersToday,
        totalActions: analyticsData?.length || 0
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados administrativos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const promoteToAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: 'admin'
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário promovido a administrador",
      });
      loadData();
    } catch (error) {
      console.error('Error promoting user:', error);
      toast({
        title: "Erro",
        description: "Erro ao promover usuário",
        variant: "destructive"
      });
    }
  };

  const toggleUserApproval = async (userId: string, currentApproval: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ approved: !currentApproval })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: !currentApproval ? "Usuário aprovado" : "Aprovação removida",
      });
      loadData();
    } catch (error) {
      console.error('Error toggling user approval:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status de aprovação",
        variant: "destructive"
      });
    }
  };

  const removeUserAccess = async (userId: string) => {
    try {
      // Remove user approval and set as inactive
      const { error } = await supabase
        .from('user_profiles')
        .update({ approved: false })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Acesso removido",
        description: "O usuário teve seu acesso removido da plataforma",
      });
      loadData();
    } catch (error) {
      console.error('Error removing user access:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover acesso do usuário",
        variant: "destructive"
      });
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Painel Administrativo</h1>
        <p className="text-muted-foreground">
          Gerencie usuários e monitore atividades da plataforma
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usuários Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
              <UserCheck className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Novos Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.newUsersToday}</div>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Ações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.totalActions}</div>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="active">Usuários Ativos</TabsTrigger>
          <TabsTrigger value="analytics">Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Cadastrados</CardTitle>
              <CardDescription>
                Lista de todos os usuários da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'Nome não informado'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role || 'Usuário'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.approved ? 'default' : 'destructive'}>
                          {user.approved ? 'Aprovado' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          size="sm"
                          variant={user.approved ? "destructive" : "default"}
                          onClick={() => toggleUserApproval(user.user_id, user.approved)}
                        >
                          {user.approved ? (
                            <>
                              <UserX className="w-3 h-3 mr-1" />
                              Reprovar
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3 mr-1" />
                              Aprovar
                            </>
                          )}
                        </Button>
                        {user.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => promoteToAdmin(user.user_id)}
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeUserAccess(user.user_id)}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Remover Acesso
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Ativos Agora</CardTitle>
              <CardDescription>
                Usuários que acessaram a plataforma nos últimos 30 minutos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Última Atividade</TableHead>
                    <TableHead>Página Atual</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeUsers.map((activeUser) => {
                    const user = users.find(u => u.user_id === activeUser.user_id);
                    return (
                      <TableRow key={activeUser.user_id}>
                        <TableCell className="font-medium">
                          {user?.full_name || 'Usuário não encontrado'}
                        </TableCell>
                        <TableCell>
                          {new Date(activeUser.last_activity).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{activeUser.page_url || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeUserAccess(activeUser.user_id)}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Remover Acesso
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {activeUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhum usuário ativo no momento
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Atividades Recentes</CardTitle>
              <CardDescription>
                Últimas 100 ações realizadas na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Página</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        {users.find(u => u.user_id === activity.user_id)?.full_name || 'Usuário anônimo'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{activity.action}</Badge>
                      </TableCell>
                      <TableCell>{activity.page}</TableCell>
                      <TableCell>
                        {new Date(activity.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};