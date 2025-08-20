import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Heart, Utensils, Calendar, TrendingUp, Plus, Trash2, Brain
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
}

interface DailyPlan {
  date: string;
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

const Saude: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState({
    age: '',
    weight: '',
    height: '',
    activityLevel: 'moderado',
    goal: 'manter',
    restrictions: ''
  });
  const [dietPlan, setDietPlan] = useState<DailyPlan[]>([]);
  const [currentMeal, setCurrentMeal] = useState<Omit<Meal, 'id'>>({
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    time: ''
  });

  const today = new Date().toISOString().split('T')[0];
  const todayPlan = dietPlan.find(plan => plan.date === today) || {
    date: today,
    meals: [],
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0
  };

  const generatePersonalizedDiet = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para usar esta funcionalidade.",
        variant: "destructive"
      });
      return;
    }

    if (!userProfile.age || !userProfile.weight || !userProfile.height) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha idade, peso e altura.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const prompt = `Crie uma dieta personalizada para uma pessoa com as seguintes características:
      - Idade: ${userProfile.age} anos
      - Peso: ${userProfile.weight} kg
      - Altura: ${userProfile.height} cm
      - Nível de atividade: ${userProfile.activityLevel}
      - Objetivo: ${userProfile.goal} peso
      - Restrições: ${userProfile.restrictions || 'nenhuma'}
      
      Forneça um plano de 7 dias com 5 refeições por dia (café da manhã, lanche da manhã, almoço, lanche da tarde, jantar).
      Para cada refeição, inclua:
      - Nome da refeição
      - Calorias aproximadas
      - Proteínas (g)
      - Carboidratos (g)
      - Gorduras (g)
      - Horário sugerido
      
      Formate a resposta como JSON válido com a estrutura:
      {
        "days": [
          {
            "date": "2024-01-01",
            "meals": [
              {
                "name": "Aveia com frutas",
                "calories": 300,
                "protein": 10,
                "carbs": 50,
                "fat": 8,
                "time": "07:00"
              }
            ]
          }
        ]
      }`;

      const { data: resp, error } = await supabase.functions.invoke('ai-processor', {
        body: { action: 'chat', message: prompt }
      });

      if (error) throw new Error(error.message);
      if (!resp?.success) throw new Error(resp?.error || 'Falha ao gerar dieta');

      try {
        const response = resp.response;
        let jsonData;
        
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Resposta da IA não contém JSON válido');
        }

        const generatedPlans: DailyPlan[] = jsonData.days.map((day: any) => ({
          date: day.date,
          meals: day.meals.map((meal: any) => ({
            id: Math.random().toString(36).slice(2),
            ...meal
          })),
          totalCalories: day.meals.reduce((sum: number, meal: any) => sum + meal.calories, 0),
          totalProtein: day.meals.reduce((sum: number, meal: any) => sum + meal.protein, 0),
          totalCarbs: day.meals.reduce((sum: number, meal: any) => sum + meal.carbs, 0),
          totalFat: day.meals.reduce((sum: number, meal: any) => sum + meal.fat, 0)
        }));

        setDietPlan(generatedPlans);

        toast({
          title: "Dieta personalizada criada!",
          description: `Plano de ${generatedPlans.length} dias gerado com sucesso.`,
        });

      } catch (parseError) {
        console.error('Parse error:', parseError);
        toast({
          title: "Erro ao processar resposta",
          description: "A IA gerou uma resposta inválida. Tente novamente.",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Diet generation error:', error);
      toast({
        title: "Erro ao gerar dieta",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const addMeal = () => {
    if (!currentMeal.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira o nome da refeição.",
        variant: "destructive"
      });
      return;
    }

    const newMeal: Meal = {
      id: Math.random().toString(36).slice(2),
      ...currentMeal
    };

    setDietPlan(prev => {
      const existingPlanIndex = prev.findIndex(plan => plan.date === today);
      
      if (existingPlanIndex >= 0) {
        const updatedPlans = [...prev];
        updatedPlans[existingPlanIndex] = {
          ...updatedPlans[existingPlanIndex],
          meals: [...updatedPlans[existingPlanIndex].meals, newMeal],
          totalCalories: updatedPlans[existingPlanIndex].totalCalories + newMeal.calories,
          totalProtein: updatedPlans[existingPlanIndex].totalProtein + newMeal.protein,
          totalCarbs: updatedPlans[existingPlanIndex].totalCarbs + newMeal.carbs,
          totalFat: updatedPlans[existingPlanIndex].totalFat + newMeal.fat
        };
        return updatedPlans;
      } else {
        return [...prev, {
          date: today,
          meals: [newMeal],
          totalCalories: newMeal.calories,
          totalProtein: newMeal.protein,
          totalCarbs: newMeal.carbs,
          totalFat: newMeal.fat
        }];
      }
    });

    setCurrentMeal({
      name: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      time: ''
    });

    toast({
      title: "Refeição adicionada",
      description: `${newMeal.name} foi adicionada ao seu dia.`,
    });
  };

  const removeMeal = (mealId: string) => {
    setDietPlan(prev => {
      return prev.map(plan => {
        if (plan.date === today) {
          const mealToRemove = plan.meals.find(meal => meal.id === mealId);
          if (mealToRemove) {
            return {
              ...plan,
              meals: plan.meals.filter(meal => meal.id !== mealId),
              totalCalories: plan.totalCalories - mealToRemove.calories,
              totalProtein: plan.totalProtein - mealToRemove.protein,
              totalCarbs: plan.totalCarbs - mealToRemove.carbs,
              totalFat: plan.totalFat - mealToRemove.fat
            };
          }
        }
        return plan;
      });
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Heart className="w-8 h-8 text-primary" />
          Saúde & Dieta
        </h1>
        <Badge variant="secondary" className="text-sm">
          Dieta Personalizada com IA
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Perfil do Usuário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Seu Perfil
            </CardTitle>
            <CardDescription>
              Informe seus dados para gerar uma dieta personalizada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="age">Idade (anos)</Label>
                <Input
                  id="age"
                  type="number"
                  value={userProfile.age}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, age: e.target.value }))}
                  placeholder="25"
                />
              </div>
              <div>
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={userProfile.weight}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="70"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={userProfile.height}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, height: e.target.value }))}
                  placeholder="170"
                />
              </div>
              <div>
                <Label htmlFor="goal">Objetivo</Label>
                <select
                  id="goal"
                  className="w-full p-2 border rounded-md"
                  value={userProfile.goal}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, goal: e.target.value }))}
                >
                  <option value="perder">Perder peso</option>
                  <option value="manter">Manter peso</option>
                  <option value="ganhar">Ganhar peso</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="activity">Nível de Atividade</Label>
              <select
                id="activity"
                className="w-full p-2 border rounded-md"
                value={userProfile.activityLevel}
                onChange={(e) => setUserProfile(prev => ({ ...prev, activityLevel: e.target.value }))}
              >
                <option value="sedentario">Sedentário</option>
                <option value="leve">Atividade leve</option>
                <option value="moderado">Atividade moderada</option>
                <option value="intenso">Atividade intensa</option>
              </select>
            </div>

            <div>
              <Label htmlFor="restrictions">Restrições Alimentares</Label>
              <Textarea
                id="restrictions"
                value={userProfile.restrictions}
                onChange={(e) => setUserProfile(prev => ({ ...prev, restrictions: e.target.value }))}
                placeholder="Ex: vegetariano, intolerância à lactose, etc."
                rows={3}
              />
            </div>

            <Button 
              onClick={generatePersonalizedDiet}
              disabled={isGenerating}
              className="w-full"
            >
              <Brain className="w-4 h-4 mr-2" />
              {isGenerating ? 'Gerando Dieta...' : 'Gerar Dieta Personalizada (IA)'}
            </Button>
          </CardContent>
        </Card>

        {/* Refeições de Hoje */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="w-5 h-5" />
              Hoje - {new Date().toLocaleDateString('pt-BR')}
            </CardTitle>
            <CardDescription>
              Registre suas refeições e acompanhe sua nutrição
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumo Nutricional */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{todayPlan.totalCalories}</div>
                <div className="text-xs text-muted-foreground">Calorias</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{todayPlan.totalProtein}g</div>
                <div className="text-xs text-muted-foreground">Proteínas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{todayPlan.totalCarbs}g</div>
                <div className="text-xs text-muted-foreground">Carboidratos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{todayPlan.totalFat}g</div>
                <div className="text-xs text-muted-foreground">Gorduras</div>
              </div>
            </div>

            {/* Adicionar Refeição */}
            <div className="space-y-3 p-4 border rounded-lg">
              <h4 className="font-medium">Adicionar Refeição</h4>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Nome da refeição"
                  value={currentMeal.name}
                  onChange={(e) => setCurrentMeal(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  type="time"
                  value={currentMeal.time}
                  onChange={(e) => setCurrentMeal(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Input
                  type="number"
                  placeholder="Cal"
                  value={currentMeal.calories || ''}
                  onChange={(e) => setCurrentMeal(prev => ({ ...prev, calories: parseInt(e.target.value) || 0 }))}
                />
                <Input
                  type="number"
                  placeholder="Prot"
                  value={currentMeal.protein || ''}
                  onChange={(e) => setCurrentMeal(prev => ({ ...prev, protein: parseInt(e.target.value) || 0 }))}
                />
                <Input
                  type="number"
                  placeholder="Carb"
                  value={currentMeal.carbs || ''}
                  onChange={(e) => setCurrentMeal(prev => ({ ...prev, carbs: parseInt(e.target.value) || 0 }))}
                />
                <Input
                  type="number"
                  placeholder="Gord"
                  value={currentMeal.fat || ''}
                  onChange={(e) => setCurrentMeal(prev => ({ ...prev, fat: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <Button onClick={addMeal} className="w-full" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {/* Lista de Refeições */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {todayPlan.meals.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma refeição registrada hoje
                </p>
              ) : (
                todayPlan.meals.map((meal) => (
                  <div key={meal.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{meal.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {meal.time} • {meal.calories} cal • P:{meal.protein}g C:{meal.carbs}g G:{meal.fat}g
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMeal(meal.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plano Semanal */}
      {dietPlan.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Plano de Dieta Gerada pela IA
            </CardTitle>
            <CardDescription>
              Sua dieta personalizada para os próximos dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dietPlan.map((plan) => (
                <div key={plan.date} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">
                    {new Date(plan.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </h4>
                  <div className="text-sm text-muted-foreground mb-2">
                    {plan.totalCalories} cal • P:{plan.totalProtein}g • C:{plan.totalCarbs}g • G:{plan.totalFat}g
                  </div>
                  <div className="space-y-1">
                    {plan.meals.slice(0, 3).map((meal) => (
                      <div key={meal.id} className="text-xs">
                        {meal.time} - {meal.name}
                      </div>
                    ))}
                    {plan.meals.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{plan.meals.length - 3} mais refeições
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Saude;