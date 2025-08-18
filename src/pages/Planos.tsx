import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  limitations: { feature: string; limit: string }[];
  highlighted?: boolean;
  icon: React.ComponentType<any>;
  color: string;
}

const Planos = () => {
  const { subscription, user } = useAuth();

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Gratuito',
      price: 0,
      period: 'mês',
      description: 'Perfeito para começar seus estudos',
      icon: Star,
      color: 'text-gray-600',
      features: [
        'Até 3 PDFs por mês',
        'Chatbot básico',
        'Flashcards ilimitados',
        'Resumos simples'
      ],
      limitations: [
        { feature: 'PDFs', limit: '3/mês' },
        { feature: 'Chat', limit: 'Básico' },
        { feature: 'Quiz', limit: '5/mês' }
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 15.00,
      period: 'mês',
      description: 'Para estudantes dedicados',
      icon: Crown,
      color: 'text-yellow-600',
      highlighted: true,
      features: [
        'PDFs ilimitados',
        'Chatbot avançado com GPT-4',
        'Geração de provas personalizadas',
        'Quiz avançados',
        'Planner inteligente',
        'Análises de desempenho',
        'Suporte prioritário'
      ],
      limitations: []
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99.90,
      period: 'mês',
      description: 'Para instituições de ensino',
      icon: Zap,
      color: 'text-purple-600',
      features: [
        'Tudo do Premium',
        'Múltiplos usuários',
        'Dashboard administrativo',
        'API personalizada',
        'Relatórios avançados',
        'Suporte dedicado',
        'Personalização da marca'
      ],
      limitations: []
    }
  ];

  const getCurrentPlan = () => {
    return subscription?.type || 'free';
  };

  const isCurrentPlan = (planId: string) => {
    return getCurrentPlan() === planId;
  };

  const handlePlanAction = (planId: string, price: number) => {
    if (!user) {
      // Redirecionar para login se não estiver logado
      window.location.href = '/auth';
      return;
    }

    if (planId !== 'free') {
      window.location.href = `/pagamento?plan=${planId}&price=${price}`;
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container-custom space-y-8">
        {/* Background */}
        <div
          className="fixed inset-0 opacity-5 pointer-events-none z-0"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1615729947596-a598e5de0ab3?w=1920&h=1080&fit=crop)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />

        {/* Header */}
        <div className="text-center relative z-10">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-high-contrast">
            <span className="gradient-text">Planos e Preços</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Escolha o plano ideal para potencializar seus estudos com inteligência artificial
          </p>
        </div>

        {/* Current Plan Info */}
        {subscription && user && (
          <Card className="bg-gradient-to-r from-primary/15 to-accent/10 border-primary/30 backdrop-blur-sm relative z-10 interactive">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-high-contrast">Plano Atual</h3>
                  <p className="text-sm text-muted-foreground">
                    Você está no plano {subscription.type === 'free' ? 'Gratuito' : subscription.type.charAt(0).toUpperCase() + subscription.type.slice(1)}
                  </p>
                </div>
                <Badge variant="outline" className="bg-primary/10">
                  {subscription.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = isCurrentPlan(plan.id);

            return (
              <Card
                key={plan.id}
                className={`relative bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300 interactive ${plan.highlighted
                    ? 'border-primary shadow-2xl scale-105 ring-2 ring-primary/20'
                    : 'border-primary/20'
                  } ${isCurrent ? 'ring-2 ring-accent' : ''}`}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-white">
                    Mais Popular
                  </Badge>
                )}

                {isCurrent && (
                  <Badge className="absolute -top-3 right-4 bg-green-500 text-white">
                    Atual
                  </Badge>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-current/10 flex items-center justify-center ${plan.color}`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-high-contrast">{plan.name}</CardTitle>
                  <div className="py-4">
                    <span className="text-5xl font-bold text-high-contrast">
                      {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2).replace('.', ',')}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground text-lg">/{plan.period}</span>
                    )}
                  </div>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Features */}
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Limitations */}
                  {plan.limitations.length > 0 && (
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-3 font-medium">Limitações:</p>
                      <div className="space-y-2">
                        {plan.limitations.map((limitation, index) => (
                          <div key={index} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{limitation.feature}</span>
                            <span className="text-muted-foreground font-medium">{limitation.limit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-4">
                    {isCurrent ? (
                      <Button disabled className="w-full interactive">
                        Plano Atual
                      </Button>
                    ) : plan.id === 'free' ? (
                      <Button variant="outline" className="w-full interactive" disabled>
                        Fazer Downgrade
                      </Button>
                    ) : (
                      <Button
                        className={`w-full interactive btn-primary ${plan.highlighted
                            ? 'bg-primary hover:bg-primary/90'
                            : ''
                          }`}
                        variant={plan.highlighted ? 'default' : 'outline'}
                        onClick={() => handlePlanAction(plan.id, plan.price)}
                      >
                        {!user ? 'Começar Agora' : getCurrentPlan() === 'free' ? 'Assinar' : 'Fazer Upgrade'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <Card className="relative z-10 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-high-contrast">Perguntas Frequentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2 text-high-contrast">Posso cancelar a qualquer momento?</h4>
              <p className="text-muted-foreground">
                Sim, você pode cancelar sua assinatura a qualquer momento. O acesso continuará até o final do período pago.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-high-contrast">Como funciona o limite de PDFs?</h4>
              <p className="text-muted-foreground">
                No plano gratuito, você pode enviar até 3 PDFs por mês. O limite é renovado todo dia 1º.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-high-contrast">Há desconto para estudantes?</h4>
              <p className="text-muted-foreground">
                Entre em contato conosco para saber sobre descontos educacionais disponíveis.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-high-contrast">Posso mudar de plano?</h4>
              <p className="text-muted-foreground">
                Sim, você pode fazer upgrade ou downgrade do seu plano a qualquer momento. As mudanças são aplicadas imediatamente.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center relative z-10">
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4 text-high-contrast">
                Pronto para revolucionar seus estudos?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Junte-se a milhares de estudantes que já transformaram sua forma de aprender com nossa plataforma
              </p>
              <Button
                size="lg"
                className="interactive btn-primary"
                onClick={() => handlePlanAction('premium', 15.00)}
              >
                {!user ? 'Começar Gratuitamente' : 'Ver Planos Premium'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Planos;