import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Clock, Utensils, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';

interface Meal {
  name: string;
  time: string;
  calories: number;
  description?: string;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface DayPlan {
  date: string;
  meals: Meal[];
}

interface DietPlan {
  days: DayPlan[];
  title?: string;
}

interface DietPlanViewerProps {
  dietPlan: DietPlan;
}

const DietPlanViewer: React.FC<DietPlanViewerProps> = ({ dietPlan }) => {
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Plano Alimentar Personalizado', 20, 20);
    
    let yPosition = 40;
    
    dietPlan.days.forEach((day, dayIndex) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(16);
      doc.text(`Dia ${dayIndex + 1} - ${new Date(day.date).toLocaleDateString('pt-BR')}`, 20, yPosition);
      yPosition += 15;
      
      day.meals.forEach((meal) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(12);
        doc.text(`${meal.time} - ${meal.name}`, 25, yPosition);
        yPosition += 7;
        
        if (meal.description) {
          doc.setFontSize(10);
          doc.text(`${meal.description}`, 30, yPosition);
          yPosition += 6;
        }
        
        doc.setFontSize(10);
        doc.text(`${meal.calories} cal`, 30, yPosition);
        yPosition += 8;
      });
      
      yPosition += 10;
    });
    
    doc.save('plano-alimentar.pdf');
  };

  const getTotalCaloriesForDay = (day: DayPlan) => {
    return day.meals.reduce((total, meal) => total + meal.calories, 0);
  };

  const getMealIcon = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 10) return '🌅'; // Café da manhã
    if (hour < 12) return '🍎'; // Lanche manhã
    if (hour < 15) return '🍽️'; // Almoço
    if (hour < 18) return '🥤'; // Lanche tarde
    return '🌙'; // Jantar
  };

  const getMealPeriod = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 10) return 'Café da Manhã';
    if (hour < 12) return 'Lanche da Manhã';
    if (hour < 15) return 'Almoço';
    if (hour < 18) return 'Lanche da Tarde';
    return 'Jantar';
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-display font-bold">Plano Alimentar Personalizado</h3>
          <p className="text-muted-foreground">Sua dieta semanal gerada por IA</p>
        </div>
        <Button onClick={exportToPDF} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="weekly">Visão Semanal</TabsTrigger>
          <TabsTrigger value="daily">Por Dia</TabsTrigger>
          <TabsTrigger value="meals">Por Refeição</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dietPlan.days.map((day, index) => (
              <Card key={day.date} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Dia {index + 1}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center p-3 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {getTotalCaloriesForDay(day)}
                    </div>
                    <div className="text-sm text-muted-foreground">calorias totais</div>
                  </div>
                  
                  <div className="space-y-2">
                    {day.meals.map((meal, mealIndex) => (
                      <div key={mealIndex} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                        <span className="text-lg">{getMealIcon(meal.time)}</span>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{meal.time}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {meal.name}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {meal.calories} cal
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="daily" className="space-y-6">
          {dietPlan.days.map((day, index) => (
            <Card key={day.date}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Dia {index + 1} - {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Total: {getTotalCaloriesForDay(day)} calorias</span>
                  <span>{day.meals.length} refeições</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {day.meals.map((meal, mealIndex) => (
                    <div key={mealIndex} className="p-4 border rounded-lg bg-gradient-to-br from-background to-muted/20">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{getMealIcon(meal.time)}</span>
                        <div>
                          <div className="font-semibold">{getMealPeriod(meal.time)}</div>
                          <div className="text-sm text-muted-foreground">{meal.time}</div>
                        </div>
                      </div>
                      
                      <h4 className="font-medium mb-2">{meal.name}</h4>
                      
                      {meal.description && (
                        <p className="text-sm text-muted-foreground mb-3">{meal.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <Badge className="bg-primary/10 text-primary">
                          {meal.calories} cal
                        </Badge>
                        {meal.protein && meal.carbs && meal.fat && (
                          <div className="text-xs text-muted-foreground">
                            P:{meal.protein}g C:{meal.carbs}g G:{meal.fat}g
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="meals" className="space-y-6">
          {['Café da Manhã', 'Lanche da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar'].map((mealType) => (
            <Card key={mealType}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="w-5 h-5" />
                  {mealType}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {dietPlan.days.map((day, dayIndex) => {
                    const meal = day.meals.find(m => getMealPeriod(m.time) === mealType);
                    if (!meal) return null;
                    
                    return (
                      <div key={dayIndex} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Dia {dayIndex + 1}</span>
                          <Badge variant="outline">{meal.time}</Badge>
                        </div>
                        <h4 className="font-medium mb-2">{meal.name}</h4>
                        {meal.description && (
                          <p className="text-sm text-muted-foreground mb-2">{meal.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <Badge className="bg-primary/10 text-primary">
                            {meal.calories} cal
                          </Badge>
                          {meal.protein && meal.carbs && meal.fat && (
                            <div className="text-xs text-muted-foreground">
                              P:{meal.protein}g C:{meal.carbs}g G:{meal.fat}g
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Nutricional Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {Math.round(dietPlan.days.reduce((total, day) => total + getTotalCaloriesForDay(day), 0) / dietPlan.days.length)}
              </div>
              <div className="text-sm text-muted-foreground">Calorias médias/dia</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dietPlan.days.reduce((total, day) => total + day.meals.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total de refeições</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {dietPlan.days.length}
              </div>
              <div className="text-sm text-muted-foreground">Dias planejados</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(dietPlan.days.reduce((total, day) => total + getTotalCaloriesForDay(day), 0) / 1000)}k
              </div>
              <div className="text-sm text-muted-foreground">Calorias totais</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DietPlanViewer;