import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Droplets,
  Moon,
  Flower,
  Brain,
  Heart,
  Target,
  CheckCircle2,
  Edit,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Habit {
  id: string;
  name: string;
  description?: string;
  category: string;
  target_value: number;
  unit: string;
  frequency: string;
  icon?: string;
  color?: string;
  created_at: string;
}

interface HabitLog {
  id: string;
  habit_id: string;
  date: string;
  value: number;
  notes?: string;
  created_at: string;
}

const HABIT_CATEGORIES = [
  { id: 'saude', name: 'Saúde', icon: Heart, color: 'bg-red-500' },
  { id: 'exercicio', name: 'Exercício', icon: Target, color: 'bg-blue-500' },
  { id: 'bem-estar', name: 'Bem-estar', icon: Flower, color: 'bg-green-500' },
  { id: 'mental', name: 'Mental', icon: Brain, color: 'bg-purple-500' },
  { id: 'sono', name: 'Sono', icon: Moon, color: 'bg-indigo-500' },
  { id: 'hidratacao', name: 'Hidratação', icon: Droplets, color: 'bg-cyan-500' },
];

const HABIT_PRESETS = [
  { name: 'Beber água', category: 'hidratacao', target: 8, unit: 'copos', icon: 'Droplets' },
  { name: 'Dormir bem', category: 'sono', target: 8, unit: 'horas', icon: 'Moon' },
  { name: 'Meditar', category: 'mental', target: 20, unit: 'minutos', icon: 'Brain' },
  { name: 'Alongamento', category: 'bem-estar', target: 15, unit: 'minutos', icon: 'Flower' },
  { name: 'Caminhada', category: 'exercicio', target: 30, unit: 'minutos', icon: 'Target' },
  { name: 'Leitura', category: 'mental', target: 30, unit: 'minutos', icon: 'Brain' },
];

const HabitTracker = () => {
  const { toast } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    category: '',
    target_value: 1,
    unit: '',
    frequency: 'daily'
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carregar hábitos
      const { data: habitsData } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Carregar logs da semana atual
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const { data: logsData } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weekStartStr);

      setHabits(habitsData || []);
      setLogs(logsData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveHabit = async () => {
    if (!newHabit.name || !newHabit.category) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e categoria são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingHabit) {
        // Atualizar hábito existente
        const { error } = await supabase
          .from('habits')
          .update(newHabit)
          .eq('id', editingHabit.id);

        if (error) throw error;

        toast({ title: "Hábito atualizado!", description: "Suas alterações foram salvas." });
      } else {
        // Criar novo hábito
        const { error } = await supabase
          .from('habits')
          .insert({
            ...newHabit,
            user_id: user.id
          });

        if (error) throw error;

        toast({ title: "Hábito criado!", description: "Novo hábito adicionado com sucesso." });
      }

      setDialogOpen(false);
      setEditingHabit(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erro ao salvar hábito:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o hábito.",
        variant: "destructive"
      });
    }
  };

  const deleteHabit = async (habitId: string) => {
    try {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', habitId);

      if (error) throw error;

      setHabits(prev => prev.filter(h => h.id !== habitId));
      toast({ title: "Hábito excluído", description: "O hábito foi removido com sucesso." });
    } catch (error) {
      console.error('Erro ao excluir hábito:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o hábito.",
        variant: "destructive"
      });
    }
  };

  const logHabit = async (habitId: string, value: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar se já existe log para hoje
      const existingLog = logs.find(log => 
        log.habit_id === habitId && log.date === today
      );

      if (existingLog) {
        // Atualizar log existente
        const { error } = await supabase
          .from('habit_logs')
          .update({ value })
          .eq('id', existingLog.id);

        if (error) throw error;

        setLogs(prev => prev.map(log => 
          log.id === existingLog.id ? { ...log, value } : log
        ));
      } else {
        // Criar novo log
        const { data: newLog, error } = await supabase
          .from('habit_logs')
          .insert({
            user_id: user.id,
            habit_id: habitId,
            date: today,
            value
          })
          .select()
          .single();

        if (error) throw error;

        setLogs(prev => [...prev, newLog]);
      }

      toast({ title: "Progresso registrado!", description: "Seu hábito foi atualizado." });
    } catch (error) {
      console.error('Erro ao registrar hábito:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar o progresso.",
        variant: "destructive"
      });
    }
  };

  const getTodayLog = (habitId: string) => {
    return logs.find(log => log.habit_id === habitId && log.date === today);
  };

  const getProgressPercentage = (habit: Habit) => {
    const todayLog = getTodayLog(habit.id);
    return todayLog ? Math.min((todayLog.value / habit.target_value) * 100, 100) : 0;
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = HABIT_CATEGORIES.find(cat => cat.id === categoryId);
    return category?.icon || Target;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = HABIT_CATEGORIES.find(cat => cat.id === categoryId);
    return category?.color || 'bg-gray-500';
  };

  const resetForm = () => {
    setNewHabit({
      name: '',
      description: '',
      category: '',
      target_value: 1,
      unit: '',
      frequency: 'daily'
    });
  };

  const editHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setNewHabit({
      name: habit.name,
      description: habit.description || '',
      category: habit.category,
      target_value: habit.target_value,
      unit: habit.unit,
      frequency: habit.frequency
    });
    setDialogOpen(true);
  };

  const usePreset = (preset: any) => {
    setNewHabit({
      name: preset.name,
      description: '',
      category: preset.category,
      target_value: preset.target,
      unit: preset.unit,
      frequency: 'daily'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hábitos Saudáveis</h2>
          <p className="text-muted-foreground">Acompanhe seus hábitos diários</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Hábito
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingHabit ? 'Editar Hábito' : 'Novo Hábito'}
              </DialogTitle>
              <DialogDescription>
                {editingHabit ? 'Modifique as informações do hábito.' : 'Configure um novo hábito para acompanhar.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Presets (apenas para novos hábitos) */}
              {!editingHabit && (
                <div className="space-y-2">
                  <Label>Hábitos sugeridos</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {HABIT_PRESETS.map((preset, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="h-auto p-2 text-left"
                        onClick={() => usePreset(preset)}
                      >
                        <div>
                          <div className="font-medium text-xs">{preset.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {preset.target} {preset.unit}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={newHabit.name}
                  onChange={(e) => setNewHabit(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Beber água"
                />
              </div>

              {/* Categoria */}
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select 
                  value={newHabit.category} 
                  onValueChange={(value) => setNewHabit(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {HABIT_CATEGORIES.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Meta e Unidade */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="target">Meta diária</Label>
                  <Input
                    id="target"
                    type="number"
                    value={newHabit.target_value}
                    onChange={(e) => setNewHabit(prev => ({ ...prev, target_value: parseInt(e.target.value) || 1 }))}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade</Label>
                  <Input
                    id="unit"
                    value={newHabit.unit}
                    onChange={(e) => setNewHabit(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="Ex: copos, minutos"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingHabit(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={saveHabit}>
                  {editingHabit ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Hábitos */}
      {habits.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Nenhum hábito encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Comece criando seu primeiro hábito saudável
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Hábito
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {habits.map((habit) => {
            const todayLog = getTodayLog(habit.id);
            const progress = getProgressPercentage(habit);
            const IconComponent = getCategoryIcon(habit.category);
            const isCompleted = progress >= 100;

            return (
              <Card key={habit.id} className={`hover:shadow-lg transition-shadow ${isCompleted ? 'ring-2 ring-green-200' : ''}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${getCategoryColor(habit.category)} text-white`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{habit.name}</CardTitle>
                        <CardDescription>
                          Meta: {habit.target_value} {habit.unit}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editHabit(habit)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteHabit(habit.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso hoje</span>
                      <span className="font-medium">
                        {todayLog?.value || 0} / {habit.target_value} {habit.unit}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="text-xs text-muted-foreground text-right">
                      {Math.round(progress)}% concluído
                    </div>
                  </div>

                  {isCompleted && (
                    <div className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        Meta atingida hoje!
                      </span>
                    </div>
                  )}

                  {/* Controles de progresso */}
                  <div className="space-y-2">
                    <Label className="text-sm">Registrar progresso</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        max={habit.target_value * 2}
                        value={todayLog?.value || 0}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          logHabit(habit.id, value);
                        }}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => logHabit(habit.id, (todayLog?.value || 0) + 1)}
                      >
                        +1
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Estatísticas Semanais */}
      {habits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Resumo da Semana
            </CardTitle>
            <CardDescription>
              Seu progresso nos últimos 7 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {habits.filter(habit => getProgressPercentage(habit) >= 100).length}
                </div>
                <div className="text-sm text-muted-foreground">Metas atingidas hoje</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(habits.reduce((acc, habit) => acc + getProgressPercentage(habit), 0) / habits.length)}%
                </div>
                <div className="text-sm text-muted-foreground">Progresso médio</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {logs.filter(log => log.date === today).length}
                </div>
                <div className="text-sm text-muted-foreground">Hábitos registrados hoje</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  7
                </div>
                <div className="text-sm text-muted-foreground">Sequência de dias</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HabitTracker;