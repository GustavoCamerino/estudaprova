import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
    Droplets, Moon, Salad, Dumbbell, StretchHorizontal, Brain, Bell, Plus, Utensils, TrendingUp, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig
} from '@/components/ui/chart';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    XAxis,
    YAxis,
    ResponsiveContainer
} from 'recharts';

type HydrationLog = { date: string; amountMl: number; goalMl: number };
type SleepLog = { date: string; hours: number };
type Meal = { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; time: string };
type NutritionLog = { date: string; meals: Meal[] };
type ActivityLog = { date: string; completed: string[] };
type MeditationLog = { date: string; minutes: number };

type HealthData = {
    hydration: HydrationLog[];
    sleep: SleepLog[];
    nutrition: NutritionLog[];
    activity: ActivityLog[];
    meditation: MeditationLog[];
    hydrationDailyGoalMl: number;
    remindersEnabled: boolean;
};

const DEFAULT_EXERCISES = [
    'Alongamento de pescoço (2 min)',
    'Rotação de ombros (2 min)',
    'Alongamento de coluna em pé (2 min)',
    'Respiração diafragmática (3 min)',
    'Caminhada leve (10 min)'
];

const todayKey = () => new Date().toISOString().split('T')[0];

const usePersistentHealthData = (userId?: string) => {
    const storageKey = userId ? `healthData:${userId}` : undefined;
    const [data, setData] = useState<HealthData>(() => {
        if (!storageKey) return {
            hydration: [], sleep: [], nutrition: [], activity: [], meditation: [],
            hydrationDailyGoalMl: 2000, remindersEnabled: false
        };
        try {
            const raw = localStorage.getItem(storageKey);
            return raw ? JSON.parse(raw) as HealthData : {
                hydration: [], sleep: [], nutrition: [], activity: [], meditation: [],
                hydrationDailyGoalMl: 2000, remindersEnabled: false
            };
        } catch {
            return {
                hydration: [], sleep: [], nutrition: [], activity: [], meditation: [],
                hydrationDailyGoalMl: 2000, remindersEnabled: false
            };
        }
    });

    useEffect(() => {
        if (!storageKey) return;
        localStorage.setItem(storageKey, JSON.stringify(data));
    }, [data, storageKey]);

    return { data, setData };
};

const Saude: React.FC = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const { data, setData } = usePersistentHealthData(user?.id);
    const today = todayKey();

    // Ensure today entries exist
    useEffect(() => {
        setData(prev => {
            const next = { ...prev } as HealthData;
            if (!next.hydration.find(d => d.date === today)) next.hydration = [...next.hydration, { date: today, amountMl: 0, goalMl: next.hydrationDailyGoalMl }];
            if (!next.sleep.find(d => d.date === today)) next.sleep = [...next.sleep, { date: today, hours: 0 }];
            if (!next.nutrition.find(d => d.date === today)) next.nutrition = [...next.nutrition, { date: today, meals: [] }];
            if (!next.activity.find(d => d.date === today)) next.activity = [...next.activity, { date: today, completed: [] }];
            if (!next.meditation.find(d => d.date === today)) next.meditation = [...next.meditation, { date: today, minutes: 0 }];
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [today, user?.id]);

    // In-app reminders (simple toast based)
    useEffect(() => {
        if (!data.remindersEnabled) return;
        const interval = setInterval(() => {
            toast({ title: 'Hora de beber água 💧', description: 'Mantenha-se hidratado!', duration: 3000 });
        }, 1000 * 60 * 60 * 2); // a cada 2h
        return () => clearInterval(interval);
    }, [data.remindersEnabled, toast]);

    const hydrationToday = data.hydration.find(d => d.date === today)!;
    const sleepToday = data.sleep.find(d => d.date === today)!;
    const nutritionToday = data.nutrition.find(d => d.date === today)!;
    const activityToday = data.activity.find(d => d.date === today)!;
    const meditationToday = data.meditation.find(d => d.date === today)!;

    const weeklyKeys = [...Array(7)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });

    const hydrationWeeklyData = weeklyKeys.map(k => {
        const item = data.hydration.find(h => h.date === k);
        return { day: k.slice(5), ml: item?.amountMl || 0, goal: item?.goalMl || data.hydrationDailyGoalMl };
    });

    const sleepWeeklyData = weeklyKeys.map(k => {
        const item = data.sleep.find(s => s.date === k);
        return { day: k.slice(5), hours: item?.hours || 0 };
    });

    const caloriesToday = nutritionToday.meals.reduce((acc, m) => acc + (m.calories || 0), 0);
    const proteinToday = nutritionToday.meals.reduce((acc, m) => acc + (m.protein || 0), 0);
    const carbsToday = nutritionToday.meals.reduce((acc, m) => acc + (m.carbs || 0), 0);
    const fatToday = nutritionToday.meals.reduce((acc, m) => acc + (m.fat || 0), 0);

    const updateHydration = (partial: Partial<HydrationLog>) => {
        setData(prev => ({
            ...prev,
            hydration: prev.hydration.map(h => h.date === today ? { ...h, ...partial } : h)
        }));
    };

    const addWater = (ml: number) => {
        updateHydration({ amountMl: Math.max(0, Math.min((hydrationToday.amountMl || 0) + ml, 10000)) });
    };

    const addMeal = (meal: Omit<Meal, 'id'>) => {
        const withId: Meal = { id: Math.random().toString(36).slice(2), ...meal };
        setData(prev => ({
            ...prev,
            nutrition: prev.nutrition.map(n => n.date === today ? { ...n, meals: [...n.meals, withId] } : n)
        }));
    };

    const removeMeal = (id: string) => {
        setData(prev => ({
            ...prev,
            nutrition: prev.nutrition.map(n => n.date === today ? { ...n, meals: n.meals.filter(m => m.id !== id) } : n)
        }));
    };

    const toggleExercise = (label: string) => {
        setData(prev => ({
            ...prev,
            activity: prev.activity.map(a => a.date === today ? {
                ...a,
                completed: a.completed.includes(label) ? a.completed.filter(x => x !== label) : [...a.completed, label]
            } : a)
        }));
    };

    const setMeditation = (minutes: number) => {
        setData(prev => ({
            ...prev,
            meditation: prev.meditation.map(m => m.date === today ? { ...m, minutes } : m)
        }));
    };

    const requestAISuggestions = async (topic: 'meals' | 'habits' | 'meditation' | 'activity') => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error('Você precisa estar autenticado.');

            const context = `Dados de hoje:\nHidratação: ${hydrationToday.amountMl}/${hydrationToday.goalMl} ml.\nSono: ${sleepToday.hours} horas.\nNutrição: ${caloriesToday} kcal (P ${proteinToday}g, C ${carbsToday}g, G ${fatToday}g).\nMeditação: ${meditationToday.minutes} min.\nAtividade concluída: ${activityToday.completed.join(', ') || 'nenhuma'}.`;
            const ask = topic === 'meals'
                ? 'Sugira 3 refeições saudáveis com calorias e macronutrientes aproximados.'
                : topic === 'activity'
                    ? 'Sugira 3 exercícios leves ou alongamentos para hoje (sem equipamentos).'
                    : topic === 'meditation'
                        ? 'Sugira 3 práticas de mindfulness com duração sugerida.'
                        : 'Sugira hábitos diários personalizados para melhorar hidratação, sono e bem-estar.';

            const { data: resp, error } = await supabase.functions.invoke('ai-processor', {
                body: { action: 'chat', message: `${context}\n\n${ask}` }
            });
            if (error) throw new Error(error.message);
            if (!resp?.success) throw new Error(resp?.error || 'Falha ao gerar sugestões');
            toast({ title: 'Sugestões da IA', description: 'Sugestões geradas com sucesso.' });
            return resp.response as string;
        } catch (e) {
            toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao chamar IA', variant: 'destructive' });
            return '';
        }
    };

    const [aiMeals, setAiMeals] = useState<string>('');
    const [aiHabits, setAiHabits] = useState<string>('');
    const [aiMeditation, setAiMeditation] = useState<string>('');
    const [aiActivity, setAiActivity] = useState<string>('');

    const chartConfig: ChartConfig = {
        ml: { label: 'Água (ml)', color: '#4A90E2' },
        goal: { label: 'Meta (ml)', color: '#7ED321' },
        hours: { label: 'Sono (h)', color: '#F5A623' },
    };

    const [newMeal, setNewMeal] = useState<Omit<Meal, 'id'>>({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0, time: '' });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-semibold">Saúde</h1>
                <div className="flex items-center gap-2">
                    <Badge style={{ backgroundColor: '#4A90E2' }} className="text-white">Hidratação</Badge>
                    <Badge style={{ backgroundColor: '#7ED321' }} className="text-white">Sono</Badge>
                    <Badge style={{ backgroundColor: '#F5A623' }} className="text-white">Bem-estar</Badge>
                </div>
            </div>

            {/* Grid responsiva */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Hidratação */}
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Droplets className="w-5 h-5" style={{ color: '#4A90E2' }} /> Hidratação</CardTitle>
                        <CardDescription>Registre sua ingestão diária de água e defina uma meta.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <Label>Meta diária (ml)</Label>
                                <Input type="number" value={hydrationToday.goalMl}
                                    onChange={(e) => updateHydration({ goalMl: Math.max(0, parseInt(e.target.value || '0')) })}
                                />
                            </div>
                            <div className="flex-1">
                                <Label>Consumido hoje (ml)</Label>
                                <Input type="number" value={hydrationToday.amountMl}
                                    onChange={(e) => updateHydration({ amountMl: Math.max(0, parseInt(e.target.value || '0')) })}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" onClick={() => addWater(250)}>+250 ml</Button>
                            <Button variant="secondary" onClick={() => addWater(500)}>+500 ml</Button>
                            <Button variant="ghost" onClick={() => updateHydration({ amountMl: 0 })}>Zerar</Button>
                            <div className="flex items-center gap-2 ml-auto">
                                <Checkbox id="reminders" checked={data.remindersEnabled} onCheckedChange={(v) => setData(prev => ({ ...prev, remindersEnabled: Boolean(v) }))} />
                                <Label htmlFor="reminders" className="flex items-center gap-1"><Bell className="w-4 h-4" /> Lembretes</Label>
                            </div>
                        </div>

                        <ChartContainer config={chartConfig} className="w-full aspect-[16/9]">
                            <BarChart data={hydrationWeeklyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar dataKey="ml" fill="#4A90E2" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="goal" fill="#7ED321" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Sono */}
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Moon className="w-5 h-5" style={{ color: '#7ED321' }} /> Sono</CardTitle>
                        <CardDescription>Registre suas horas de sono e veja sugestões.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Horas dormidas hoje: {sleepToday.hours}h</Label>
                            <Slider value={[sleepToday.hours]} min={0} max={12} step={0.5} onValueChange={(v) => setData(prev => ({ ...prev, sleep: prev.sleep.map(s => s.date === today ? { ...s, hours: v[0] } : s) }))} />
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Sugestão ideal: {sleepToday.hours < 7 ? 'Tente dormir entre 7-9 horas.' : 'Ótimo! Mantenha entre 7-9 horas.'}
                        </div>
                        <ChartContainer config={chartConfig} className="w-full aspect-[16/9]">
                            <LineChart data={sleepWeeklyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Line type="monotone" dataKey="hours" stroke="#F5A623" strokeWidth={2} dot />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Nutrição */}
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Utensils className="w-5 h-5" style={{ color: '#F5A623' }} /> Alimentação / Nutrição</CardTitle>
                        <CardDescription>Registre suas refeições e acompanhe calorias e macros.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                            <div className="md:col-span-2">
                                <Label>Refeição</Label>
                                <Input value={newMeal.name} onChange={(e) => setNewMeal(s => ({ ...s, name: e.target.value }))} placeholder="Ex: Salada com frango" />
                            </div>
                            <div>
                                <Label>Calorias</Label>
                                <Input type="number" value={newMeal.calories} onChange={(e) => setNewMeal(s => ({ ...s, calories: parseInt(e.target.value || '0') }))} />
                            </div>
                            <div>
                                <Label>Proteína (g)</Label>
                                <Input type="number" value={newMeal.protein} onChange={(e) => setNewMeal(s => ({ ...s, protein: parseInt(e.target.value || '0') }))} />
                            </div>
                            <div>
                                <Label>Carbo (g)</Label>
                                <Input type="number" value={newMeal.carbs} onChange={(e) => setNewMeal(s => ({ ...s, carbs: parseInt(e.target.value || '0') }))} />
                            </div>
                            <div>
                                <Label>Gordura (g)</Label>
                                <Input type="number" value={newMeal.fat} onChange={(e) => setNewMeal(s => ({ ...s, fat: parseInt(e.target.value || '0') }))} />
                            </div>
                            <div className="md:col-span-1">
                                <Label>Horário</Label>
                                <Input type="time" value={newMeal.time} onChange={(e) => setNewMeal(s => ({ ...s, time: e.target.value }))} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={() => { if (newMeal.name) { addMeal(newMeal); setNewMeal({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0, time: '' }); } }}>Adicionar</Button>
                            <Button variant="secondary" onClick={async () => setAiMeals(await requestAISuggestions('meals'))}>Sugestões de refeições (IA)</Button>
                        </div>

                        <div className="grid gap-2">
                            {nutritionToday.meals.map(m => (
                                <div key={m.id} className="flex items-center justify-between rounded-md border p-2">
                                    <div className="space-y-1">
                                        <div className="font-medium">{m.time || '—'} · {m.name}</div>
                                        <div className="text-xs text-muted-foreground">{m.calories} kcal · P {m.protein}g · C {m.carbs}g · G {m.fat}g</div>
                                    </div>
                                    <Button variant="ghost" onClick={() => removeMeal(m.id)}>Remover</Button>
                                </div>
                            ))}
                            {aiMeals && (
                                <div className="text-sm bg-muted rounded-md p-3 whitespace-pre-wrap">{aiMeals}</div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-md p-3" style={{ backgroundColor: '#4A90E2', color: 'white' }}>
                                <div className="text-xs opacity-90">Calorias</div>
                                <div className="text-2xl font-bold">{caloriesToday}</div>
                            </div>
                            <div className="rounded-md p-3 bg-green-600 text-white">
                                <div className="text-xs opacity-90">Proteína</div>
                                <div className="text-2xl font-bold">{proteinToday}g</div>
                            </div>
                            <div className="rounded-md p-3 bg-orange-500 text-white">
                                <div className="text-xs opacity-90">Carbo</div>
                                <div className="text-2xl font-bold">{carbsToday}g</div>
                            </div>
                            <div className="rounded-md p-3 bg-amber-700 text-white">
                                <div className="text-xs opacity-90">Gordura</div>
                                <div className="text-2xl font-bold">{fatToday}g</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Atividade física / Alongamento */}
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Dumbbell className="w-5 h-5" style={{ color: '#4A90E2' }} /> Atividade física / Alongamento</CardTitle>
                        <CardDescription>Marque exercícios concluídos e receba sugestões.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid gap-2">
                            {DEFAULT_EXERCISES.map(ex => (
                                <label key={ex} className="flex items-center gap-2">
                                    <Checkbox checked={activityToday.completed.includes(ex)} onCheckedChange={() => toggleExercise(ex)} />
                                    <span>{ex}</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" onClick={async () => setAiActivity(await requestAISuggestions('activity'))}>Sugestões de exercícios (IA)</Button>
                        </div>
                        {aiActivity && (
                            <div className="text-sm bg-muted rounded-md p-3 whitespace-pre-wrap">{aiActivity}</div>
                        )}
                    </CardContent>
                </Card>

                {/* Meditação / Bem-estar mental */}
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5" style={{ color: '#7ED321' }} /> Meditação / Bem-estar</CardTitle>
                        <CardDescription>Registre sua prática e receba técnicas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <Label>Minutos de meditação hoje: {meditationToday.minutes} min</Label>
                            <Slider value={[meditationToday.minutes]} min={0} max={60} step={5} onValueChange={(v) => setMeditation(v[0])} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" onClick={async () => setAiMeditation(await requestAISuggestions('meditation'))}>Sugestões de técnicas (IA)</Button>
                        </div>
                        {aiMeditation && (
                            <div className="text-sm bg-muted rounded-md p-3 whitespace-pre-wrap">{aiMeditation}</div>
                        )}
                    </CardContent>
                </Card>

                {/* IA: hábitos personalizados */}
                <Card className="shadow-md xl:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Recomendações de hábitos (IA)</CardTitle>
                        <CardDescription>Receba recomendações diárias personalizadas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button onClick={async () => setAiHabits(await requestAISuggestions('habits'))}>Gerar recomendações</Button>
                        {aiHabits && (
                            <div className="text-sm bg-muted rounded-md p-3 whitespace-pre-wrap">{aiHabits}</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Saude;

