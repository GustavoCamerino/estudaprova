import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';

interface ResumeViewerProps {
  title: string;
  content: string;
}

const ResumeViewer: React.FC<ResumeViewerProps> = ({ title, content }) => {
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(title, 20, 20);
    
    // Split content into lines and add to PDF
    const lines = content.split('\n');
    let yPosition = 40;
    
    lines.forEach((line) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      if (line.startsWith('#')) {
        doc.setFontSize(16);
        doc.text(line.replace('#', '').trim(), 20, yPosition);
        yPosition += 15;
      } else if (line.startsWith('##')) {
        doc.setFontSize(14);
        doc.text(line.replace('##', '').trim(), 20, yPosition);
        yPosition += 12;
      } else if (line.trim()) {
        doc.setFontSize(12);
        doc.text(line.trim(), 20, yPosition);
        yPosition += 8;
      } else {
        yPosition += 5;
      }
    });
    
    doc.save(`${title}.pdf`);
  };

  const formatContent = (content: string) => {
    return content
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium mb-2">$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br />');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-display font-bold">{title}</h3>
        <Button onClick={exportToPDF} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <div 
            dangerouslySetInnerHTML={{ __html: formatContent(content) }}
            className="space-y-4"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ResumeViewer;