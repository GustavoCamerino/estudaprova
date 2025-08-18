import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Wand2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WorkoutGeneratorProps {
  onWorkoutCreated: () => void;
}

interface WorkoutSettings {
  goal: string;
  experience: string;
  duration: string;
  equipment: string[];
  focusAreas: string[];
}

const EQUIPMENT_OPTIONS = [
  'Halteres',
  'Barra',
  'Banco',
  'Leg Press',
  'Esteira',
  'Bicicleta',
  'Elíptico',
  'Kettlebell',
  'Faixas elásticas',
  'Peso corporal',
  'Máquinas',
  'Corda',
  'Medicine Ball',
  'TRX'
];

const FOCUS_AREAS = [
  'Peito',
  'Costas',
  'Ombros',
  'Braços',
  'Pernas',
  'Glúteos',
  'Core/Abdômen',
  'Cardio',
  'Flexibilidade',
  'Força',
  'Resistência'
];

const SAMPLE_EXERCISES = {
  peito: [
    { name: 'Supino reto', sets: 3, reps: '8-12', equipment: ['Barra', 'Banco'] },
    { name: 'Flexão de braço', sets: 3, reps: '10-15', equipment: ['Peso corporal'] },
    { name: 'Crucifixo com halteres', sets: 3, reps: '12-15', equipment: ['Halteres', 'Banco'] },
  ],
  costas: [
    { name: 'Puxada alta', sets: 3, reps: '8-12', equipment: ['Máquinas'] },
    { name: 'Remada curvada', sets: 3, reps: '8-12', equipment: ['Barra'] },
    { name: 'Pulldown', sets: 3, reps: '10-12', equipment: ['Máquinas'] },
  ],
  pernas: [
    { name: 'Agachamento', sets: 4, reps: '12-15', equipment: ['Barra'] },
    { name: 'Leg Press', sets: 3, reps: '15-20', equipment: ['Leg Press'] },
    { name: 'Afundo', sets: 3, reps: '12 cada', equipment: ['Halteres'] },
  ],
  cardio: [
    { name: 'Corrida na esteira', sets: 1, reps: '20 min', equipment: ['Esteira'] },
    { name: 'Bicicleta', sets: 1, reps: '15 min', equipment: ['Bicicleta'] },
    { name: 'Burpees', sets: 3, reps: '30 seg', equipment: ['Peso corporal'] },
  ]
};

const WorkoutGenerator: React.FC<WorkoutGeneratorProps> = ({ onWorkoutCreated }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [settings, setSettings] = useState<WorkoutSettings>({
    goal: '',
    experience: '',
    duration: '',
    equipment: [],
    focusAreas: []
  });

  const generateWorkout = async () => {
    if (!settings.goal || !settings.experience || !settings.duration) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha objetivo, experiência e duração.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Simular geração de treino baseado nas configurações
      const exercises = generateExerciseList(settings);
      
      const workoutData = {
        user_id: user.id,
        name: `Treino ${settings.goal} - ${settings.experience}`,
        description: `Treino focado em ${settings.focusAreas.join(', ')} para ${settings.goal.toLowerCase()}`,
        difficulty_level: settings.experience.toLowerCase(),
        equipment: settings.equipment,
        duration_minutes: parseInt(settings.duration),
        exercises: exercises
      };

      const { data, error } = await supabase
        .from('workouts')
        .insert(workoutData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Treino gerado! 🎉",
        description: `${data.name} foi criado com ${exercises.length} exercícios.`,
      });

      onWorkoutCreated();
      setIsOpen(false);
      resetSettings();

    } catch (error) {
      console.error('Erro ao gerar treino:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o treino.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateExerciseList = (settings: WorkoutSettings) => {
    const exercises: any[] = [];
    const duration = parseInt(settings.duration);
    
    // Definir número de exercícios baseado na duração
    const exerciseCount = duration <= 30 ? 6 : duration <= 60 ? 8 : 10;
    
    // Selecionar exercícios baseado nas áreas de foco
    settings.focusAreas.forEach((area, index) => {
      if (exercises.length >= exerciseCount) return;
      
      const areaKey = area.toLowerCase().includes('peito') ? 'peito' :
                     area.toLowerCase().includes('costas') ? 'costas' :
                     area.toLowerCase().includes('pernas') || area.toLowerCase().includes('glúteos') ? 'pernas' :
                     'cardio';
      
      const areaExercises = SAMPLE_EXERCISES[areaKey as keyof typeof SAMPLE_EXERCISES] || SAMPLE_EXERCISES.cardio;
      const selectedExercise = areaExercises[index % areaExercises.length];
      
      exercises.push({
        id: `ex_${Date.now()}_${index}`,
        name: selectedExercise.name,
        sets: selectedExercise.sets,
        reps: selectedExercise.reps,
        equipment: selectedExercise.equipment.filter(eq => 
          settings.equipment.length === 0 || settings.equipment.includes(eq)
        ),
        muscle_groups: [area]
      });
    });

    // Preencher com exercícios extras se necessário
    while (exercises.length < exerciseCount) {
      const allExercises = Object.values(SAMPLE_EXERCISES).flat();
      const randomExercise = allExercises[Math.floor(Math.random() * allExercises.length)];
      
      exercises.push({
        id: `ex_${Date.now()}_${exercises.length}`,
        name: randomExercise.name,
        sets: randomExercise.sets,
        reps: randomExercise.reps,
        equipment: randomExercise.equipment,
        muscle_groups: ['Geral']
      });
    }

    return exercises.slice(0, exerciseCount);
  };

  const resetSettings = () => {
    setSettings({
      goal: '',
      experience: '',
      duration: '',
      equipment: [],
      focusAreas: []
    });
  };

  const toggleEquipment = (equipment: string) => {
    setSettings(prev => ({
      ...prev,
      equipment: prev.equipment.includes(equipment)
        ? prev.equipment.filter(e => e !== equipment)
        : [...prev.equipment, equipment]
    }));
  };

  const toggleFocusArea = (area: string) => {
    setSettings(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter(a => a !== area)
        : [...prev.focusAreas, area]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Gerar Treino IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Gerar Treino Personalizado
          </DialogTitle>
          <DialogDescription>
            Configure suas preferências e a IA criará um treino personalizado para você.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Objetivo */}
          <div className="space-y-2">
            <Label htmlFor="goal">Objetivo Principal *</Label>
            <Select value={settings.goal} onValueChange={(value) => setSettings(prev => ({ ...prev, goal: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione seu objetivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Perda de peso">Perda de peso</SelectItem>
                <SelectItem value="Ganho de massa">Ganho de massa muscular</SelectItem>
                <SelectItem value="Condicionamento">Condicionamento físico</SelectItem>
                <SelectItem value="Força">Ganho de força</SelectItem>
                <SelectItem value="Resistência">Resistência</SelectItem>
                <SelectItem value="Tonificação">Tonificação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Experiência */}
          <div className="space-y-2">
            <Label htmlFor="experience">Nível de Experiência *</Label>
            <Select value={settings.experience} onValueChange={(value) => setSettings(prev => ({ ...prev, experience: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione sua experiência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Iniciante">Iniciante (0-6 meses)</SelectItem>
                <SelectItem value="Intermediario">Intermediário (6 meses - 2 anos)</SelectItem>
                <SelectItem value="Avancado">Avançado (2+ anos)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duração */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duração do Treino (minutos) *</Label>
            <Select value={settings.duration} onValueChange={(value) => setSettings(prev => ({ ...prev, duration: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Quanto tempo você tem?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1 hora e 30 minutos</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Equipamentos */}
          <div className="space-y-3">
            <Label>Equipamentos Disponíveis</Label>
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT_OPTIONS.map((equipment) => (
                <div key={equipment} className="flex items-center space-x-2">
                  <Checkbox
                    id={equipment}
                    checked={settings.equipment.includes(equipment)}
                    onCheckedChange={() => toggleEquipment(equipment)}
                  />
                  <label
                    htmlFor={equipment}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {equipment}
                  </label>
                </div>
              ))}
            </div>
            {settings.equipment.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {settings.equipment.map((eq) => (
                  <Badge key={eq} variant="secondary" className="text-xs">
                    {eq}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Áreas de Foco */}
          <div className="space-y-3">
            <Label>Áreas de Foco</Label>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_AREAS.map((area) => (
                <div key={area} className="flex items-center space-x-2">
                  <Checkbox
                    id={area}
                    checked={settings.focusAreas.includes(area)}
                    onCheckedChange={() => toggleFocusArea(area)}
                  />
                  <label
                    htmlFor={area}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {area}
                  </label>
                </div>
              ))}
            </div>
            {settings.focusAreas.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {settings.focusAreas.map((area) => (
                  <Badge key={area} variant="outline" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={generateWorkout} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Gerar Treino
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutGenerator;