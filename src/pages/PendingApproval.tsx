import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Shield, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const PendingApproval = () => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-none shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>

            <h2 className="text-2xl font-bold mb-4">Aguardando Aprovação</h2>

            <div className="space-y-3 text-muted-foreground mb-6">
              <p>
                Sua conta foi criada com sucesso, mas ainda precisa ser aprovada pelo administrador.
              </p>

              <div className="flex items-center justify-center space-x-2 text-sm">
                <Shield className="w-4 h-4" />
                <span>Por questões de segurança, todas as contas são revisadas</span>
              </div>

              <div className="flex items-center justify-center space-x-2 text-sm">
                <Mail className="w-4 h-4" />
                <span>Você receberá um email quando sua conta for aprovada</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full"
              >
                Sair da conta
              </Button>

              <p className="text-xs text-muted-foreground">
                Este processo pode levar até 24 horas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};