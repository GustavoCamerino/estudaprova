import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface PDFData {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
}

interface PDFDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdf?: PDFData;
  onSave: (pdf: Omit<PDFData, 'id'>) => void;
}

const PDFDialog: React.FC<PDFDialogProps> = ({ open, onOpenChange, pdf, onSave }) => {
  const [formData, setFormData] = useState({
    name: pdf?.name || '',
    description: pdf?.description || '',
    tags: pdf?.tags?.join(', ') || ''
  });

  const handleSave = () => {
    if (!formData.name.trim()) return;
    
    onSave({
      name: formData.name,
      description: formData.description,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    });
    
    onOpenChange(false);
    
    // Reset form if creating new
    if (!pdf) {
      setFormData({
        name: '',
        description: '',
        tags: ''
      });
    }
  };

  const isEditing = !!pdf;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEditing ? 'Editar PDF' : 'Novo PDF'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifique as informações do PDF' : 'Adicione informações ao PDF'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="col-span-3"
              placeholder="Nome do arquivo"
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="col-span-3"
              placeholder="Descrição do conteúdo..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="col-span-3"
              placeholder="matemática, física, história..."
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.name.trim()}
            className="bg-gradient-to-r from-primary to-primary-glow"
          >
            {isEditing ? 'Salvar Alterações' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PDFDialog;