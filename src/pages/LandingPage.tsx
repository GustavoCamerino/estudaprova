import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Zap,
  Users,
  Star,
  Check,
  FileText,
  Target,
  Calendar,
  BarChart3
} from 'lucide-react';

export const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: FileText,
      title: "Upload de PDFs",
      description: "Envie seus materiais de estudo e transforme-os em conteúdo interativo"
    },
    {
      icon: Brain,
      title: "Resumos Inteligentes",
      description: "IA gera resumos personalizados do seu material"
    },
    {
      icon: Zap,
      title: "Flashcards Automáticos",
      description: "Cartões de memorização criados automaticamente"
    },
    {
      icon: Target,
      title: "Quiz Personalizado",
      description: "Testes gerados com base no conteúdo do PDF"
    },
    {
      icon: Calendar,
      title: "Planner de Estudos",
      description: "Cronograma inteligente com revisões periódicas"
    },
    {
      icon: BarChart3,
      title: "Acompanhamento",
      description: "Monitore seu progresso e performance"
    }
  ];

  const testimonials = [
    {
      name: "Maria Silva",
      role: "Estudante de Medicina",
      content: "O Estuda.AI revolucionou minha forma de estudar. Os resumos são incríveis!",
      rating: 5
    },
    {
      name: "João Santos",
      role: "Concurseiro",
      content: "Consegui organizar melhor meus estudos e aumentar minha produtividade.",
      rating: 5
    },
    {
      name: "Ana Costa",
      role: "Estudante de Direito",
      content: "Os flashcards gerados automaticamente me ajudaram muito na memorização.",
      rating: 5
    }
  ];

  const plans = [
    {
      name: "Gratuito",
      price: "R$ 0",
      period: "/mês",
      features: [
        "3 PDFs por mês",
        "Resumos básicos",
        "Flashcards limitados",
        "Quiz simples"
      ],
      cta: "Começar Grátis",
      popular: false
    },
    {
      name: "Premium",
      price: "R$ 29",
      period: "/mês",
      features: [
        "PDFs ilimitados",
        "Resumos avançados",
        "Flashcards ilimitados",
        "Quiz personalizado",
        "Planner completo",
        "Análise de performance",
        "Suporte prioritário"
      ],
      cta: "Assinar Premium",
      popular: true
    }
  ];

  const handleButtonClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen w-full">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80)'
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10"></div>
        <div className="container-custom relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <h1 className="text-4xl lg:text-6xl font-bold mb-6 text-high-contrast">
                Transforme seus
                <span className="gradient-text"> PDFs </span>
                em aprendizado
                <span className="gradient-text"> inteligente</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Com inteligência artificial, geramos resumos, flashcards e quiz personalizados
                dos seus materiais de estudo. Organize seus estudos e alcance seus objetivos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="text-lg px-8 interactive btn-primary"
                  onClick={() => handleButtonClick(user ? '/dashboard' : '/auth')}
                >
                  {user ? 'Ir para Dashboard' : 'Começar Agora'}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 interactive"
                  onClick={() => handleButtonClick('/planos')}
                >
                  Ver Planos
                </Button>
              </div>
            </div>

            <div className="relative animate-slide-in-right">
              <div className="floating">
                <div className="bg-gradient-to-br from-primary to-secondary p-8 rounded-2xl shadow-2xl">
                  <div className="bg-white rounded-xl p-6 space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Material de Estudo.pdf</h3>
                        <p className="text-sm text-muted-foreground">Processando...</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-primary/20 rounded-full">
                        <div className="h-2 bg-primary rounded-full w-3/4"></div>
                      </div>
                      <p className="text-xs text-muted-foreground">Gerando resumo e flashcards...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-high-contrast">
              Funcionalidades que
              <span className="gradient-text"> potencializam </span>
              seus estudos
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Descubra como nossa plataforma pode transformar sua experiência de aprendizado
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="card-hover border-none shadow-card interactive">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-high-contrast">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="relative py-20 bg-muted/30 overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1426604966848-d7adac402bff?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80)'
          }}
        ></div>
        <div className="absolute inset-0 bg-muted/20"></div>
        <div className="container-custom relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-high-contrast">
              Como
              <span className="gradient-text"> funciona</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Em poucos passos, transforme seus PDFs em material de estudo interativo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Upload do PDF",
                description: "Faça upload do seu material de estudo em formato PDF"
              },
              {
                step: "2",
                title: "Processamento IA",
                description: "Nossa IA analisa o conteúdo e gera resumos, flashcards e quiz"
              },
              {
                step: "3",
                title: "Estude & Aprenda",
                description: "Acesse seu material otimizado e acompanhe seu progresso"
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-high-contrast">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-background">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-high-contrast">
              O que nossos
              <span className="gradient-text"> estudantes </span>
              dizem
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-none shadow-card">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-accent fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold text-high-contrast">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-muted/30">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-high-contrast">
              Escolha o plano
              <span className="gradient-text"> ideal </span>
              para você
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative border-none shadow-card ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-1 rounded-full text-sm font-medium">
                      Mais Popular
                    </div>
                  </div>
                )}
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2 text-high-contrast">{plan.name}</h3>
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="w-5 h-5 text-secondary mr-3" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full interactive btn-primary"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleButtonClick(user ? '/planos' : '/auth')}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 bg-gradient-to-r from-primary to-secondary overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1500673922987-e212871fec22?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80)'
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/60 to-secondary/60"></div>
        <div className="container-custom text-center relative z-10">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Pronto para revolucionar seus estudos?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de estudantes que já transformaram sua forma de aprender
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="text-lg px-8 interactive btn-primary"
            onClick={() => handleButtonClick(user ? '/dashboard' : '/auth')}
          >
            {user ? 'Acessar Dashboard' : 'Começar Gratuitamente'}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>
    </div>
  );
};