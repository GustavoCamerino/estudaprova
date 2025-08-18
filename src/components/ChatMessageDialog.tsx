import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface SavedMessage {
  id: string;
  title: string;
  content: string;
  type: 'flashcard' | 'resume' | 'quiz' | 'prova' | 'normal';
  category?: string;
  createdAt: Date;
}

interface ChatMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: SavedMessage;
  onSave: (message: Omit<SavedMessage, 'id' | 'createdAt'>) => void;
}

const ChatMessageDialog: React.FC<ChatMessageDialogProps> = ({ open, onOpenChange, message, onSave }) => {
  const [formData, setFormData] = useState({
    title: message?.title || '',
    content: message?.content || '',
    type: message?.type || 'normal' as const,
    category: message?.category || ''
  });

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) return;
    
    onSave({
      title: formData.title,
      content: formData.content,
      type: formData.type,
      category: formData.category
    });
    
    onOpenChange(false);
    
    // Reset form if creating new
    if (!message) {
      setFormData({
        title: '',
        content: '',
        type: 'normal',
        category: ''
      });
    }
  };

  const isEditing = !!message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEditing ? 'Editar Conversa Salva' : 'Salvar Conversa'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifique os dados da conversa' : 'Salve esta conversa para acessar depois'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="col-span-3"
              placeholder="Nome da conversa"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Tipo</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: 'flashcard' | 'resume' | 'quiz' | 'prova' | 'normal') => 
                setFormData(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Conversa Normal</SelectItem>
                <SelectItem value="flashcard">Flashcards</SelectItem>
                <SelectItem value="resume">Resumo</SelectItem>
                <SelectItem value="quiz">Quiz</SelectItem>
                <SelectItem value="prova">Prova</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">Categoria</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="col-span-3"
              placeholder="Ex: Matemática, História..."
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="content" className="text-right pt-2">Conteúdo</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              className="col-span-3"
              placeholder="Conteúdo da conversa..."
              rows={8}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.title.trim() || !formData.content.trim()}
            className="bg-gradient-to-r from-primary to-primary-glow"
          >
            {isEditing ? 'Salvar Alterações' : 'Salvar Conversa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChatMessageDialog;