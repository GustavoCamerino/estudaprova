import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

export interface StudyTask {
  id: string;
  title: string;
  subject: string;
  description?: string;
  duration: number;
  completed: boolean;
  date: Date;
  priority: 'low' | 'medium' | 'high';
  type: 'reading' | 'practice' | 'review' | 'exam';
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: StudyTask;
  onSave: (task: Omit<StudyTask, 'id' | 'completed'>) => void;
}

const TaskDialog: React.FC<TaskDialogProps> = ({ open, onOpenChange, task, onSave }) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    subject: task?.subject || '',
    description: task?.description || '',
    duration: task?.duration || 60,
    date: task?.date || new Date(),
    priority: task?.priority || 'medium' as const,
    type: task?.type || 'reading' as const
  });

  const handleSave = () => {
    if (!formData.title.trim() || !formData.subject.trim()) return;
    
    onSave({
      title: formData.title,
      subject: formData.subject,
      description: formData.description,
      duration: formData.duration,
      date: formData.date,
      priority: formData.priority,
      type: formData.type
    });
    
    onOpenChange(false);
    
    // Reset form if creating new task
    if (!task) {
      setFormData({
        title: '',
        subject: '',
        description: '',
        duration: 60,
        date: new Date(),
        priority: 'medium',
        type: 'reading'
      });
    }
  };

  const isEditing = !!task;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifique os dados da tarefa' : 'Adicione uma nova tarefa ao seu planner'}
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
              placeholder="Nome da tarefa"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subject" className="text-right">Matéria</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              className="col-span-3"
              placeholder="Ex: Matemática, História..."
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="col-span-3"
              placeholder="Detalhes opcionais da tarefa..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">Duração (min)</Label>
            <Input
              id="duration"
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
              className="col-span-3"
              min="1"
              step="5"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="col-span-3 justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.date, "PPP", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Prioridade</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value: 'low' | 'medium' | 'high') => 
                setFormData(prev => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Tipo</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: 'reading' | 'practice' | 'review' | 'exam') => 
                setFormData(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reading">Leitura</SelectItem>
                <SelectItem value="practice">Prática</SelectItem>
                <SelectItem value="review">Revisão</SelectItem>
                <SelectItem value="exam">Prova</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.title.trim() || !formData.subject.trim()}
            className="bg-gradient-to-r from-primary to-primary-glow"
          >
            {isEditing ? 'Salvar Alterações' : 'Criar Tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDialog;