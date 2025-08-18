import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageSquare, Calendar, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatSession {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  pdf_count?: number;
}

interface SessionManagerProps {
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  currentSessionId,
  onSessionSelect,
  onNewSession
}) => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          pdfs:pdfs(count)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setSessions(data?.map(session => ({
        ...session,
        pdf_count: session.pdfs?.[0]?.count || 0
      })) || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as sessões.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          name: `Nova Sessão - ${new Date().toLocaleDateString()}`
        })
        .select()
        .single();

      if (error) throw error;

      setSessions(prev => [data, ...prev]);
      onNewSession();
      
      toast({
        title: "Sessão criada",
        description: "Nova sessão criada com sucesso.",
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar nova sessão.",
        variant: "destructive"
      });
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      toast({
        title: "Sessão removida",
        description: "Sessão removida com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a sessão.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="animate-pulse">Carregando sessões...</div>;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Sessões de Chat</CardTitle>
          <Button size="sm" onClick={createNewSession}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Sessão
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma sessão encontrada. Crie uma nova sessão para começar.
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  currentSessionId === session.id
                    ? 'bg-primary/10 border-primary'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => onSessionSelect(session.id)}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.name}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(session.updated_at).toLocaleDateString()}</span>
                      {session.pdf_count > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {session.pdf_count} PDF{session.pdf_count > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};