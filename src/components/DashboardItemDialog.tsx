import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface DashboardItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
  category: 'action' | 'stat';
  value?: string;
}

interface DashboardItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: DashboardItem;
  onSave: (item: Omit<DashboardItem, 'id'>) => void;
}

const DashboardItemDialog: React.FC<DashboardItemDialogProps> = ({ open, onOpenChange, item, onSave }) => {
  const [formData, setFormData] = useState({
    title: item?.title || '',
    description: item?.description || '',
    icon: item?.icon || 'MessageSquare',
    href: item?.href || '',
    color: item?.color || 'bg-blue-500/10 text-blue-600',
    category: item?.category || 'action' as const,
    value: item?.value || ''
  });

  const handleSave = () => {
    if (!formData.title.trim() || !formData.description.trim()) return;
    
    onSave({
      title: formData.title,
      description: formData.description,
      icon: formData.icon,
      href: formData.href,
      color: formData.color,
      category: formData.category,
      value: formData.value
    });
    
    onOpenChange(false);
    
    // Reset form if creating new
    if (!item) {
      setFormData({
        title: '',
        description: '',
        icon: 'MessageSquare',
        href: '',
        color: 'bg-blue-500/10 text-blue-600',
        category: 'action',
        value: ''
      });
    }
  };

  const isEditing = !!item;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEditing ? 'Editar Item do Dashboard' : 'Novo Item do Dashboard'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifique o item do dashboard' : 'Adicione um novo item ao dashboard'}
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
              placeholder="Nome do item"
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="col-span-3"
              placeholder="Descrição do item..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Categoria</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value: 'action' | 'stat') => 
                setFormData(prev => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="action">Ação Rápida</SelectItem>
                <SelectItem value="stat">Estatística</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="icon" className="text-right">Ícone</Label>
            <Input
              id="icon"
              value={formData.icon}
              onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
              className="col-span-3"
              placeholder="MessageSquare, Upload, Calendar..."
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="href" className="text-right">Link</Label>
            <Input
              id="href"
              value={formData.href}
              onChange={(e) => setFormData(prev => ({ ...prev, href: e.target.value }))}
              className="col-span-3"
              placeholder="/chat, /pdfs..."
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">Cor</Label>
            <Input
              id="color"
              value={formData.color}
              onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              className="col-span-3"
              placeholder="bg-blue-500/10 text-blue-600"
            />
          </div>
          
          {formData.category === 'stat' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">Valor</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                className="col-span-3"
                placeholder="12, 48, 23..."
              />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.title.trim() || !formData.description.trim()}
            className="bg-gradient-to-r from-primary to-primary-glow"
          >
            {isEditing ? 'Salvar Alterações' : 'Criar Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardItemDialog;