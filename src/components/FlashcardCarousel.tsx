import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RotateCcw, Download } from 'lucide-react';
import jsPDF from 'jspdf';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

interface FlashcardCarouselProps {
  cards: Flashcard[];
  title?: string;
}

const FlashcardCarousel: React.FC<FlashcardCarouselProps> = ({ cards, title = "Flashcards" }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % cards.length);
    setIsFlipped(false);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    setIsFlipped(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(title, 20, 20);
    
    let yPosition = 40;
    cards.forEach((card, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.text(`${index + 1}. ${card.question}`, 20, yPosition);
      yPosition += 10;
      doc.setFontSize(12);
      doc.text(`R: ${card.answer}`, 25, yPosition);
      yPosition += 20;
    });
    
    doc.save(`${title}.pdf`);
  };

  if (!cards || cards.length === 0) return null;

  const currentCard = cards[currentIndex];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-display font-bold">{title}</h3>
        <Button onClick={exportToPDF} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>
      
      <div className="relative">
        <Card 
          className="h-80 cursor-pointer transition-transform duration-300 hover:scale-105"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-full">
              {!isFlipped ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">Pergunta</p>
                  <h4 className="text-xl font-medium leading-relaxed">
                    {currentCard.question}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-6">
                    Clique para ver a resposta
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">Resposta</p>
                  <p className="text-lg leading-relaxed">
                    {currentCard.answer}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFlipped(false);
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Ver pergunta
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div className="flex items-center justify-between mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={prevCard}
            disabled={cards.length <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} de {cards.length}
          </span>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={nextCard}
            disabled={cards.length <= 1}
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardCarousel;