import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CreditCard, Clock, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const Pagamento = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [pixCopied, setPixCopied] = useState(false);

  const planId = searchParams.get('plan');
  const price = parseFloat(searchParams.get('price') || '0');

  const planNames = {
    premium: 'Premium',
    enterprise: 'Enterprise'
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!planId || !price) {
      navigate('/planos');
      return;
    }
  }, [user, planId, price, navigate]);

  const generatePixPayment = async () => {
    setLoading(true);
    try {
      // Since orders table doesn't have user_id, we'll create a simple mock order
      const orderData = {
        id: crypto.randomUUID(),
        plan_type: planId,
        amount: price,
        payment_method: 'pix',
        pix_qr_code: 'PIX_QR_CODE_PLACEHOLDER',
        pix_copy_paste: `00020126330014BR.GOV.BCB.PIX0111EstudaAI${Date.now()}5204000053039865802BR5925ESTUDA AI LTDA6009SAO PAULO62070503***6304`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      };

      setOrder(orderData);
      toast.success('PIX gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PIX:', error);
      toast.error('Erro ao gerar PIX. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = () => {
    if (order?.pix_copy_paste) {
      navigator.clipboard.writeText(order.pix_copy_paste);
      setPixCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  if (!planId || !price) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/planos')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para planos
          </Button>
          
          <h1 className="text-3xl font-bold mb-2">Finalizar Pagamento</h1>
          <p className="text-muted-foreground">
            Complete sua assinatura do plano {planNames[planId as keyof typeof planNames]}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Resumo do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Plano {planNames[planId as keyof typeof planNames]}</span>
                <Badge variant="secondary">Mensal</Badge>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total</span>
                <span>R$ {price.toFixed(2).replace('.', ',')}</span>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>• Cobrança mensal recorrente</p>
                <p>• Cancele a qualquer momento</p>
                <p>• Acesso imediato após confirmação</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Pagamento via PIX</CardTitle>
              <CardDescription>
                Pagamento instantâneo e seguro
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!order ? (
                <Button 
                  onClick={generatePixPayment}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Gerando PIX...' : 'Gerar PIX'}
                </Button>
              ) : (
                <div className="space-y-4">
                  {/* PIX QR Code Placeholder */}
                  <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                    <div className="w-48 h-48 mx-auto bg-muted rounded-lg flex items-center justify-center mb-4">
                      <span className="text-muted-foreground text-sm">QR Code PIX</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Escaneie o QR Code com seu banco
                    </p>
                  </div>

                  {/* PIX Copy & Paste */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Código PIX Copia e Cola</label>
                    <div className="flex gap-2">
                      <div className="flex-1 p-3 bg-muted rounded-md text-sm font-mono break-all">
                        {order.pix_copy_paste}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={copyPixCode}
                        className="px-3"
                      >
                        {pixCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expiration */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Expira em 24 horas</span>
                  </div>

                  {/* Status */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Aguardando pagamento</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      O plano será ativado automaticamente após a confirmação do pagamento.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Como pagar com PIX</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Pelo QR Code:</h4>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Abra o app do seu banco</li>
                  <li>2. Escolha a opção PIX</li>
                  <li>3. Escaneie o QR Code</li>
                  <li>4. Confirme o pagamento</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Pelo código:</h4>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Copie o código PIX</li>
                  <li>2. Abra o app do seu banco</li>
                  <li>3. Cole o código na opção PIX</li>
                  <li>4. Confirme o pagamento</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};