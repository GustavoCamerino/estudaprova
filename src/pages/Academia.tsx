import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Dumbbell,
  Plus,
  Play,
  Check,
  Clock,
  Target,
  Calendar,
  User,
  Zap,
  Heart,
  Droplets,
  Moon,
  Flower,
  Brain,
  Edit,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import WorkoutGenerator from '@/components/WorkoutGenerator';
import HabitTracker from '@/components/HabitTracker';

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  equipment: string[];
  muscle_groups: string[];
  description?: string;
  completed?: boolean;
}

interface Workout {
  id: string;
  name: string;
  description?: string;
  difficulty_level: string;
  equipment: string[];
  duration_minutes?: number;
  exercises: any;
  created_at: string;
}

interface WorkoutSession {
  id: string;
  workout_id: string;
  date: string;
  exercises_completed: any;
  notes?: string;
  duration_minutes?: number;
  completed: boolean;
  created_at?: string;
}

const Academia = () => {
  const { toast } = useToast();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('treinos');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carregar treinos
      const { data: workoutsData } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Carregar sessões do dia atual
      const today = new Date().toISOString().split('T')[0];
      const { data: sessionsData } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);

      setWorkouts((workoutsData || []) as Workout[]);
      setSessions((sessionsData || []) as WorkoutSession[]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startWorkout = async (workout: Workout) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      
      // Verificar se já existe uma sessão para hoje
      const existingSession = sessions.find(s => s.workout_id === workout.id);
      
      if (existingSession) {
        setCurrentSession(existingSession);
        setActiveWorkout(workout);
      } else {
        // Criar nova sessão
        const { data: newSession, error } = await supabase
          .from('workout_sessions')
          .insert({
            user_id: user.id,
            workout_id: workout.id,
            date: today,
            exercises_completed: [],
            completed: false
          })
          .select()
          .single();

        if (error) throw error;

        setCurrentSession(newSession);
        setActiveWorkout(workout);
        setSessions(prev => [...prev, newSession]);
      }

      toast({
        title: "Treino iniciado!",
        description: `Iniciando ${workout.name}. Boa sorte!`,
      });
    } catch (error) {
      console.error('Erro ao iniciar treino:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o treino.",
        variant: "destructive"
      });
    }
  };

  const completeExercise = async (exerciseId: string) => {
    if (!currentSession || !activeWorkout) return;

    try {
      const completedExercises = [...(currentSession.exercises_completed || [])];
      const exerciseIndex = completedExercises.findIndex(e => e.exercise_id === exerciseId);
      
      if (exerciseIndex >= 0) {
        completedExercises.splice(exerciseIndex, 1);
      } else {
        completedExercises.push({
          exercise_id: exerciseId,
          completed_at: new Date().toISOString()
        });
      }

      const { error } = await supabase
        .from('workout_sessions')
        .update({ 
          exercises_completed: completedExercises,
          completed: completedExercises.length === activeWorkout.exercises.length
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      setCurrentSession(prev => prev ? {
        ...prev,
        exercises_completed: completedExercises,
        completed: completedExercises.length === activeWorkout.exercises.length
      } : null);

      if (completedExercises.length === activeWorkout.exercises.length) {
        toast({
          title: "Treino concluído! 🎉",
          description: "Parabéns! Você completou todos os exercícios.",
        });
      }
    } catch (error) {
      console.error('Erro ao marcar exercício:', error);
    }
  };

  const finishWorkout = async () => {
    if (!currentSession) return;

    try {
      const { error } = await supabase
        .from('workout_sessions')
        .update({ 
          completed: true,
          duration_minutes: Math.floor((Date.now() - new Date(currentSession.created_at).getTime()) / 60000)
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      setCurrentSession(null);
      setActiveWorkout(null);
      loadData();

      toast({
        title: "Treino finalizado!",
        description: "Excelente trabalho! Continue assim.",
      });
    } catch (error) {
      console.error('Erro ao finalizar treino:', error);
    }
  };

  const deleteWorkout = async (workoutId: string) => {
    try {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (error) throw error;

      setWorkouts(prev => prev.filter(w => w.id !== workoutId));
      
      toast({
        title: "Treino excluído",
        description: "O treino foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao excluir treino:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o treino.",
        variant: "destructive"
      });
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'iniciante': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'intermediario': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'avancado': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-secondary p-6 rounded-b-3xl mb-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Academia & Saúde</h1>
          <p className="text-white/90">Gerencie seus treinos e hábitos saudáveis</p>
        </div>
      </div>

      <div className="container mx-auto p-4 space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="treinos" className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              Treinos
            </TabsTrigger>
            <TabsTrigger value="habitos" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Hábitos
            </TabsTrigger>
            <TabsTrigger value="progresso" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Progresso
            </TabsTrigger>
          </TabsList>

          {/* Treinos Tab */}
          <TabsContent value="treinos" className="space-y-6">
            {/* Treino Ativo */}
            {activeWorkout && currentSession && (
              <Card className="border-primary bg-gradient-to-r from-primary/5 to-secondary/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-primary">
                        <Play className="w-5 h-5" />
                        Treino Ativo: {activeWorkout.name}
                      </CardTitle>
                      <CardDescription>
                        {currentSession.exercises_completed?.length || 0} de {activeWorkout.exercises.length} exercícios concluídos
                      </CardDescription>
                    </div>
                    <Button onClick={finishWorkout} variant="outline">
                      Finalizar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress 
                    value={(currentSession.exercises_completed?.length || 0) / activeWorkout.exercises.length * 100} 
                    className="h-2"
                  />
                  
                  <div className="grid gap-3">
                    {activeWorkout.exercises.map((exercise) => {
                      const isCompleted = currentSession.exercises_completed?.some(e => e.exercise_id === exercise.id);
                      
                      return (
                        <div
                          key={exercise.id}
                          className={`p-4 rounded-lg border transition-all ${
                            isCompleted 
                              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                              : 'bg-background border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                {exercise.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {exercise.sets} séries × {exercise.reps}
                              </p>
                              {exercise.equipment.length > 0 && (
                                <div className="flex gap-1 mt-2">
                                  {exercise.equipment.map((eq, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {eq}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button
                              onClick={() => completeExercise(exercise.id)}
                              variant={isCompleted ? "outline" : "default"}
                              size="sm"
                              className="ml-4"
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de Treinos */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Meus Treinos</h2>
              <WorkoutGenerator onWorkoutCreated={loadData} />
            </div>

            {workouts.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Dumbbell className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Nenhum treino encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie seu primeiro treino personalizado com IA
                  </p>
                  <WorkoutGenerator onWorkoutCreated={loadData} />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workouts.map((workout) => {
                  const todaySession = sessions.find(s => s.workout_id === workout.id);
                  const isCompleted = todaySession?.completed || false;
                  
                  return (
                    <Card key={workout.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{workout.name}</CardTitle>
                            <CardDescription className="mt-1">
                              {workout.description}
                            </CardDescription>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteWorkout(workout.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Badge className={getDifficultyColor(workout.difficulty_level)}>
                            {workout.difficulty_level}
                          </Badge>
                          {workout.duration_minutes && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {workout.duration_minutes}min
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {workout.exercises.length} exercícios
                          </p>
                          
                          {workout.equipment.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {workout.equipment.slice(0, 3).map((eq, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {eq}
                                </Badge>
                              ))}
                              {workout.equipment.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{workout.equipment.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        <Separator />

                        <div className="flex justify-between items-center">
                          {isCompleted ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Concluído hoje
                            </Badge>
                          ) : todaySession && !isCompleted ? (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                              Em andamento
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Pronto para começar
                            </span>
                          )}
                          
                          <Button
                            onClick={() => startWorkout(workout)}
                            disabled={activeWorkout?.id === workout.id}
                            size="sm"
                          >
                            {activeWorkout?.id === workout.id ? (
                              'Ativo'
                            ) : isCompleted ? (
                              'Treinar novamente'
                            ) : (
                              'Iniciar'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Hábitos Tab */}
          <TabsContent value="habitos">
            <HabitTracker />
          </TabsContent>

          {/* Progresso Tab */}
          <TabsContent value="progresso" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Treinos esta semana</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {sessions.filter(s => s.completed).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    de {workouts.length} disponíveis
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tempo total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0)}min
                  </div>
                  <p className="text-xs text-muted-foreground">
                    exercitados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Sequência</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">
                    dias consecutivos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de conclusão</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">87%</div>
                  <p className="text-xs text-muted-foreground">
                    exercícios completos
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Progresso Semanal</CardTitle>
                <CardDescription>
                  Suas atividades dos últimos 7 dias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day, i) => (
                    <div key={day} className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="font-medium">{day}</span>
                      <div className="flex items-center gap-2">
                        {i % 2 === 0 ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Completo
                          </Badge>
                        ) : (
                          <Badge variant="outline">Descanso</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Academia;