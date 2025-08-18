import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import LifeWheel from '@/components/LifeWheel';
import TaskDialog, { StudyTask } from '@/components/TaskDialog';
import GoalDialog, { Goal } from '@/components/GoalDialog';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  BookOpen, 
  Target,
  CheckCircle2,
  Circle,
  TrendingUp,
  Brain,
  Heart,
  Edit,
  Trash2,
  MoreHorizontal,
  Star,
  Sparkles,
  Trophy
} from 'lucide-react';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImportantDate {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  category: string;
  reminder_enabled: boolean;
}

const Planner = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [newDateDialog, setNewDateDialog] = useState(false);
  const [newDateForm, setNewDateForm] = useState({
    title: '',
    description: '',
    event_date: '',
    event_time: '',
    category: 'general'
  });

  // Load data from database
  useEffect(() => {
    loadPlannerData();
  }, []);

  const loadPlannerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load goals
      const { data: goalsData } = await supabase
        .from('planner_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (goalsData) {
        setGoals(goalsData.map(goal => ({
          id: goal.id,
          title: goal.title,
          description: goal.description,
          category: goal.category as 'short' | 'long',
          type: goal.type,
          progress: goal.progress,
          monthlyProgress: goal.monthly_progress,
          annualProgress: goal.annual_progress,
          deadline: goal.deadline ? new Date(goal.deadline) : undefined,
          priority: goal.priority as 'high' | 'medium' | 'low',
          status: goal.status as 'active' | 'completed' | 'paused'
        })));
      }

      // Load tasks
      const { data: tasksData } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('task_date', { ascending: true });

      if (tasksData) {
        setTasks(tasksData.map(task => ({
          id: task.id,
          title: task.title,
          subject: task.subject,
          description: task.description,
          duration: task.duration,
          completed: task.completed,
          date: new Date(task.task_date),
          priority: task.priority as 'high' | 'medium' | 'low',
          type: task.task_type as 'reading' | 'practice' | 'review' | 'exam'
        })));
      }

      // Load important dates
      const { data: datesData } = await supabase
        .from('important_dates')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });

      if (datesData) {
        setImportantDates(datesData);
      }
    } catch (error) {
      console.error('Error loading planner data:', error);
    }
  };

  // Task Dialog State
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | undefined>();

  // Goal Dialog State
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>();

  // Delete Confirmation State
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  // Goal Progress State
  const [goalProgressId, setGoalProgressId] = useState<string | null>(null);
  const [newProgress, setNewProgress] = useState<number>(0);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
    
    const task = tasks.find(t => t.id === id);
    if (task) {
      toast({
        title: task.completed ? "Tarefa reaberta" : "Tarefa concluída!",
        description: `"${task.title}" foi ${task.completed ? 'reaberta' : 'marcada como concluída'}.`,
      });
    }
  };

  const handleCreateTask = async (taskData: Omit<StudyTask, 'id' | 'completed'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('planner_tasks')
        .insert({
          user_id: user.id,
          title: taskData.title,
          subject: taskData.subject,
          description: taskData.description,
          duration: taskData.duration,
          task_date: taskData.date.toISOString().split('T')[0],
          priority: taskData.priority,
          task_type: taskData.type
        })
        .select()
        .single();

      if (error) throw error;

      const newTask: StudyTask = {
        ...taskData,
        id: data.id,
        completed: false
      };
      setTasks(prev => [...prev, newTask]);
      toast({
        title: "Tarefa criada!",
        description: `"${newTask.title}" foi adicionada ao seu planner.`,
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar tarefa",
        variant: "destructive"
      });
    }
  };

  const handleEditTask = (task: StudyTask) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const handleUpdateTask = (taskData: Omit<StudyTask, 'id' | 'completed'>) => {
    if (!editingTask) return;
    
    setTasks(prev => prev.map(task => 
      task.id === editingTask.id 
        ? { ...task, ...taskData }
        : task
    ));
    
    setEditingTask(undefined);
    toast({
      title: "Tarefa atualizada!",
      description: `"${taskData.title}" foi modificada com sucesso.`,
    });
  };

  const handleDeleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(task => task.id !== id));
    setDeleteTaskId(null);
    
    if (task) {
      toast({
        title: "Tarefa removida",
        description: `"${task.title}" foi removida do seu planner.`,
      });
    }
  };

  const handleCreateGoal = async (goalData: Omit<Goal, 'id' | 'progress' | 'status' | 'monthlyProgress' | 'annualProgress'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('planner_goals')
        .insert({
          user_id: user.id,
          title: goalData.title,
          description: goalData.description,
          category: goalData.category,
          type: goalData.type,
          deadline: goalData.deadline?.toISOString().split('T')[0],
          priority: goalData.priority
        })
        .select()
        .single();

      if (error) throw error;

      const newGoal: Goal = {
        ...goalData,
        id: data.id,
        progress: 0,
        monthlyProgress: 0,
        annualProgress: 0,
        status: 'active'
      };
      setGoals(prev => [...prev, newGoal]);
      toast({
        title: "Meta criada!",
        description: `"${newGoal.title}" foi adicionada às suas metas.`,
      });
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar meta",
        variant: "destructive"
      });
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalDialogOpen(true);
  };

  const handleUpdateGoal = (goalData: Omit<Goal, 'id' | 'progress' | 'status' | 'monthlyProgress' | 'annualProgress'>) => {
    if (!editingGoal) return;
    
    setGoals(prev => prev.map(goal => 
      goal.id === editingGoal.id 
        ? { ...goal, ...goalData }
        : goal
    ));
    
    setEditingGoal(undefined);
    toast({
      title: "Meta atualizada!",
      description: `"${goalData.title}" foi modificada com sucesso.`,
    });
  };

  const handleDeleteGoal = (id: string) => {
    const goal = goals.find(g => g.id === id);
    setGoals(prev => prev.filter(goal => goal.id !== id));
    setDeleteGoalId(null);
    
    if (goal) {
      toast({
        title: "Meta removida",
        description: `"${goal.title}" foi removida das suas metas.`,
      });
    }
  };

  const handleUpdateGoalProgress = async (id: string, progress: number) => {
    try {
      const { error } = await supabase
        .from('planner_goals')
        .update({ 
          progress,
          status: progress >= 100 ? 'completed' : 'active'
        })
        .eq('id', id);

      if (error) throw error;

      setGoals(prev => prev.map(goal => 
        goal.id === id 
          ? { 
              ...goal, 
              progress,
              status: progress >= 100 ? 'completed' : 'active'
            }
          : goal
      ));
      
      const goal = goals.find(g => g.id === id);
      if (goal) {
        toast({
          title: "Progresso atualizado!",
          description: `"${goal.title}" agora está ${progress}% concluída.`,
        });
      }
      
      setGoalProgressId(null);
    } catch (error) {
      console.error('Error updating goal progress:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar progresso",
        variant: "destructive"
      });
    }
  };

  const handleCreateImportantDate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!newDateForm.title || !newDateForm.event_date) {
        toast({
          title: "Erro",
          description: "Título e data são obrigatórios",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('important_dates')
        .insert({
          user_id: user.id,
          title: newDateForm.title,
          description: newDateForm.description,
          event_date: newDateForm.event_date,
          event_time: newDateForm.event_time || null,
          category: newDateForm.category
        })
        .select()
        .single();

      if (error) throw error;

      setImportantDates(prev => [...prev, data]);
      setNewDateForm({
        title: '',
        description: '',
        event_date: '',
        event_time: '',
        category: 'general'
      });
      setNewDateDialog(false);

      toast({
        title: "Data importante criada!",
        description: `"${newDateForm.title}" foi adicionada ao calendário.`,
      });
    } catch (error) {
      console.error('Error creating important date:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar data importante",
        variant: "destructive"
      });
    }
  };

  const todayTasks = tasks.filter(task => 
    task.date.toDateString() === selectedDate.toDateString()
  );

  const completedTasks = todayTasks.filter(task => task.completed).length;
  const totalTasks = todayTasks.length;
  const totalDuration = todayTasks.reduce((sum, task) => sum + task.duration, 0);
  const completedDuration = todayTasks
    .filter(task => task.completed)
    .reduce((sum, task) => sum + task.duration, 0);

  const shortTermGoals = goals.filter(goal => goal.category === 'short');
  const longTermGoals = goals.filter(goal => goal.category === 'long');
  
  // Get upcoming important dates (next 30 days)
  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);
  const upcomingDates = importantDates.filter(date => {
    const eventDate = new Date(date.event_date);
    return isAfter(eventDate, today) && isBefore(eventDate, thirtyDaysFromNow);
  }).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-600';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600';
      case 'low': return 'bg-green-500/10 text-green-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reading': return BookOpen;
      case 'practice': return Target;
      case 'review': return Clock;
      case 'exam': return CalendarIcon;
      default: return Circle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-600';
      case 'active': return 'bg-blue-500/10 text-blue-600';
      case 'paused': return 'bg-yellow-500/10 text-yellow-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Background with motivational gradient */}
      <div 
        className="fixed inset-0 opacity-10 pointer-events-none z-0"
        style={{
          background: `linear-gradient(135deg, 
            hsl(var(--primary)) 0%, 
            hsl(var(--primary-glow)) 25%, 
            hsl(var(--accent)) 50%, 
            hsl(var(--primary-variant)) 75%, 
            hsl(var(--primary)) 100%)`,
        }}
      />
      
      {/* Floating elements for aesthetic */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Star className="absolute top-20 left-10 w-4 h-4 text-primary/20 animate-pulse" />
        <Sparkles className="absolute top-40 right-20 w-6 h-6 text-accent/30 animate-bounce" />
        <Trophy className="absolute bottom-40 left-20 w-5 h-5 text-primary-glow/25 animate-pulse" />
        <Target className="absolute bottom-20 right-10 w-4 h-4 text-primary/20 animate-bounce" />
      </div>
      
      {/* Header */}
      <div className="relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-5xl font-display font-bold mb-4 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
            ✨ Planner de Vida & Estudos ✨
          </h1>
          <p className="text-muted-foreground text-xl mb-2">
            Organize sua rotina, equilibre sua vida e acompanhe seu crescimento pessoal
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Target className="w-4 h-4 text-primary" />
              <span>{goals.length} metas</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>{tasks.filter(t => t.completed).length} tarefas concluídas</span>
            </div>
            <div className="flex items-center space-x-1">
              <CalendarIcon className="w-4 h-4 text-accent" />
              <span>{upcomingDates.length} eventos próximos</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="relative z-10">
        <TabsList className="grid w-full grid-cols-5 bg-card/90 backdrop-blur-md border border-primary/20 shadow-lg">
          <TabsTrigger value="calendar" className="flex items-center space-x-2 transition-all">
            <CalendarIcon className="h-4 w-4" />
            <span>Agenda</span>
          </TabsTrigger>
          <TabsTrigger value="important-dates" className="flex items-center space-x-2 transition-all">
            <Star className="h-4 w-4" />
            <span>Datas</span>
          </TabsTrigger>
          <TabsTrigger value="life-wheel" className="flex items-center space-x-2 transition-all">
            <Heart className="h-4 w-4" />
            <span>Roda da Vida</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center space-x-2 transition-all">
            <Target className="h-4 w-4" />
            <span>Metas</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2 transition-all">
            <TrendingUp className="h-4 w-4" />
            <span>Progresso</span>
          </TabsTrigger>
        </TabsList>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-1 bg-card/90 backdrop-blur-md border-primary/30 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
                <CardTitle className="flex items-center space-x-2 font-display">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <span>Calendário</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  className="rounded-md border border-primary/20 bg-background/50"
                />
              </CardContent>
            </Card>

            {/* Tasks and Progress */}
            <div className="lg:col-span-2 space-y-6">
              {/* Progress Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Tarefas</p>
                        <p className="text-2xl font-bold">{completedTasks}/{totalTasks}</p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Tempo Total</p>
                        <p className="text-2xl font-bold">{Math.floor(totalDuration / 60)}h {totalDuration % 60}m</p>
                      </div>
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Progresso</p>
                        <p className="text-2xl font-bold">{Math.round((completedDuration / totalDuration) * 100) || 0}%</p>
                      </div>
                      <Target className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tasks for Selected Date */}
              <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-display">
                        Tarefas para {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                      </CardTitle>
                      <CardDescription>
                        {todayTasks.length} tarefas programadas
                      </CardDescription>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-variant hover:to-primary"
                      onClick={() => {
                        setEditingTask(undefined);
                        setTaskDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Tarefa
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {todayTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa programada</h3>
                      <p className="text-muted-foreground">
                        Adicione tarefas para organizar seu dia de estudos
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {todayTasks.map((task) => {
                        const Icon = getTypeIcon(task.type);
                        return (
                          <div
                            key={task.id}
                            className={`flex items-center space-x-4 p-3 rounded-lg border ${
                              task.completed ? 'bg-muted/50' : 'bg-background'
                            }`}
                          >
                            <button
                              onClick={() => toggleTask(task.id)}
                              className="flex-shrink-0"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>

                            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                            <div className="flex-1 min-w-0">
                              <h4 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                              </h4>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <span>{task.subject}</span>
                                <span>•</span>
                                <span>{task.duration} min</span>
                              </div>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                              )}
                            </div>

                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                            </Badge>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => setDeleteTaskId(task.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Life Wheel Tab */}
        <TabsContent value="life-wheel" className="space-y-6">
          <LifeWheel />
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Short Term Goals */}
            <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-display flex items-center space-x-2">
                      <Target className="h-5 w-5 text-primary" />
                      <span>Metas de Curto Prazo</span>
                    </CardTitle>
                    <CardDescription>Objetivos para os próximos 3 meses</CardDescription>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setEditingGoal(undefined);
                      setGoalDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Meta
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {shortTermGoals.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Nenhuma meta de curto prazo</p>
                  </div>
                ) : (
                  shortTermGoals.map((goal) => (
                    <div key={goal.id} className="space-y-2 p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{goal.title}</span>
                            <Badge className={getStatusColor(goal.status)}>
                              {goal.status === 'completed' ? 'Concluída' : 
                               goal.status === 'active' ? 'Ativa' : 'Pausada'}
                            </Badge>
                          </div>
                          {goal.description && (
                            <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Prazo: {format(goal.deadline, "PPP", { locale: ptBR })}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setNewProgress(goal.progress);
                              setGoalProgressId(goal.id);
                            }}>
                              <Target className="h-4 w-4 mr-2" />
                              Atualizar Progresso
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditGoal(goal)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteGoalId(goal.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                      <div className="text-sm text-muted-foreground">
                        {goal.progress}% concluído
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Long Term Goals */}
            <Card className="bg-card/80 backdrop-blur-sm border-accent/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-display flex items-center space-x-2">
                      <Brain className="h-5 w-5 text-accent" />
                      <span>Metas de Longo Prazo</span>
                    </CardTitle>
                    <CardDescription>Objetivos para o próximo ano</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {longTermGoals.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Nenhuma meta de longo prazo</p>
                  </div>
                ) : (
                  longTermGoals.map((goal) => (
                    <div key={goal.id} className="space-y-2 p-3 border rounded-lg border-accent/20">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{goal.title}</span>
                            <Badge className={getStatusColor(goal.status)}>
                              {goal.status === 'completed' ? 'Concluída' : 
                               goal.status === 'active' ? 'Ativa' : 'Pausada'}
                            </Badge>
                          </div>
                          {goal.description && (
                            <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Prazo: {format(goal.deadline, "PPP", { locale: ptBR })}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setNewProgress(goal.progress);
                              setGoalProgressId(goal.id);
                            }}>
                              <Target className="h-4 w-4 mr-2" />
                              Atualizar Progresso
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditGoal(goal)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteGoalId(goal.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                      <div className="text-sm text-muted-foreground">
                        {goal.progress}% concluído
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">87%</div>
                  <div className="text-sm text-muted-foreground">Taxa de Conclusão</div>
                  <div className="text-xs text-green-600 mt-1">↑ 12% este mês</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">156h</div>
                  <div className="text-sm text-muted-foreground">Tempo Total de Estudo</div>
                  <div className="text-xs text-blue-600 mt-1">↑ 23h esta semana</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">23</div>
                  <div className="text-sm text-muted-foreground">Sequência de Dias</div>
                  <div className="text-xs text-purple-600 mt-1">Recorde pessoal!</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
              <CardHeader>
                <CardTitle className="font-display">Progresso Mensal das Metas</CardTitle>
                <CardDescription>Acompanhe o progresso mensal de suas metas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{goal.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {goal.type}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <Progress value={goal.monthlyProgress} className="h-3" />
                        </div>
                        <div className="w-12 text-sm text-muted-foreground">
                          {goal.monthlyProgress}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/80 backdrop-blur-sm border-primary/20">
              <CardHeader>
                <CardTitle className="font-display">Progresso Anual das Metas</CardTitle>
                <CardDescription>Visão geral do progresso anual de suas metas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{goal.title}</span>
                        <Badge 
                          variant={goal.category === 'short' ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {goal.category === 'short' ? 'Curto Prazo' : 'Longo Prazo'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <Progress value={goal.annualProgress} className="h-3" />
                        </div>
                        <div className="w-12 text-sm text-muted-foreground">
                          {goal.annualProgress}%
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Prazo: {format(goal.deadline, "PPP", { locale: ptBR })}</span>
                        <span>Prioridade: {goal.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        onSave={editingTask ? handleUpdateTask : handleCreateTask}
      />

      {/* Goal Dialog */}
      <GoalDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        goal={editingGoal}
        onSave={editingGoal ? handleUpdateGoal : handleCreateGoal}
      />

      {/* Goal Progress Dialog */}
      <AlertDialog open={!!goalProgressId} onOpenChange={() => setGoalProgressId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atualizar Progresso da Meta</AlertDialogTitle>
            <AlertDialogDescription>
              Ajuste o progresso da meta selecionada
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label className="text-sm font-medium mb-2 block">
              Progresso: {newProgress}%
            </Label>
            <Slider
              value={[newProgress]}
              onValueChange={(value) => setNewProgress(value[0])}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => goalProgressId && handleUpdateGoalProgress(goalProgressId, newProgress)}>
              Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Task Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteTaskId && handleDeleteTask(deleteTaskId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Goal Confirmation */}
      <AlertDialog open={!!deleteGoalId} onOpenChange={() => setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Meta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteGoalId && handleDeleteGoal(deleteGoalId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Planner;