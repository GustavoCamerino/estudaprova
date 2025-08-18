import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export const AuthConfirmedPage = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check URL for confirmation status
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const tokenHash = urlParams.get('token_hash');
    
    if (type === 'email' && tokenHash) {
      setStatus('success');
      setMessage('Email confirmado com sucesso! Você já pode fazer login.');
    } else if (urlParams.get('error')) {
      setStatus('error');
      setMessage('Erro ao confirmar email. O link pode ter expirado.');
    } else {
      setStatus('error');
      setMessage('Link de confirmação inválido.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardContent className="p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold mb-2">Verificando...</h2>
              <p className="text-muted-foreground">
                Confirmando seu email, aguarde...
              </p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-secondary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-secondary">Email Confirmado!</h2>
              <p className="text-muted-foreground mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <Button onClick={() => navigate('/auth')} className="w-full">
                  Fazer Login
                </Button>
                <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                  Voltar ao Início
                </Button>
              </div>
            </>
          )}
          
          {status === 'error' && (
            <>
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-destructive">Erro na Confirmação</h2>
              <p className="text-muted-foreground mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <Button onClick={() => navigate('/auth')} className="w-full">
                  Tentar Novamente
                </Button>
                <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                  Voltar ao Início
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};