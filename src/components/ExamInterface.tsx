import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Download, Check, X } from 'lucide-react';
import jsPDF from 'jspdf';

interface MultipleChoiceQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  points: number;
}

interface EssayQuestion {
  id: string;
  question: string;
  points: number;
  expectedAnswer: string;
}

interface ExamInterfaceProps {
  title: string;
  multipleChoice: MultipleChoiceQuestion[];
  essays?: EssayQuestion[];
}

const ExamInterface: React.FC<ExamInterfaceProps> = ({ title, multipleChoice, essays = [] }) => {
  const [mcAnswers, setMcAnswers] = useState<{ [key: string]: number }>({});
  const [essayAnswers, setEssayAnswers] = useState<{ [key: string]: string }>({});
  const [showResults, setShowResults] = useState(false);

  const handleMCAnswer = (questionId: string, answerIndex: number) => {
    setMcAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleEssayAnswer = (questionId: string, answer: string) => {
    setEssayAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const finishExam = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    let mcScore = 0;
    let totalMCPoints = 0;
    
    multipleChoice?.forEach(question => {
      totalMCPoints += question.points;
      if (mcAnswers[question.id] === question.correctAnswer) {
        mcScore += question.points;
      }
    });
    
    const totalEssayPoints = essays?.reduce((sum, q) => sum + q.points, 0) || 0;
    const totalPoints = totalMCPoints + totalEssayPoints;
    
    return { mcScore, totalMCPoints, totalEssayPoints, totalPoints };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const { mcScore, totalMCPoints, totalEssayPoints, totalPoints } = calculateScore();
    
    doc.setFontSize(20);
    doc.text(title, 20, 20);
    doc.setFontSize(14);
    doc.text(`Múltipla Escolha: ${mcScore}/${totalMCPoints} pontos`, 20, 35);
    doc.text(`Dissertativas: ${totalEssayPoints} pontos disponíveis`, 20, 45);
    doc.text(`Total: ${mcScore}/${totalPoints} pontos`, 20, 55);
    
    let yPosition = 70;
    
    // Multiple choice questions
    doc.setFontSize(16);
    doc.text('Questões de Múltipla Escolha:', 20, yPosition);
    yPosition += 15;
    
    multipleChoice.forEach((question, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      const userAnswer = mcAnswers[question.id];
      const isCorrect = userAnswer === question.correctAnswer;
      
      doc.setFontSize(12);
      doc.text(`${index + 1}. ${question.question} (${question.points} pts)`, 20, yPosition);
      yPosition += 10;
      
      question.options.forEach((option, optIndex) => {
        const prefix = optIndex === question.correctAnswer ? '✓' : 
                     optIndex === userAnswer && !isCorrect ? '✗' : '';
        doc.text(`${prefix} ${String.fromCharCode(97 + optIndex)}) ${option}`, 25, yPosition);
        yPosition += 7;
      });
      yPosition += 10;
    });
    
    // Essay questions
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(16);
    doc.text('Questões Dissertativas:', 20, yPosition);
    yPosition += 15;
    
    essays.forEach((question, index) => {
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(12);
      doc.text(`${index + 1}. ${question.question} (${question.points} pts)`, 20, yPosition);
      yPosition += 10;
      
      const userAnswer = essayAnswers[question.id] || 'Não respondida';
      doc.text(`Sua resposta: ${userAnswer}`, 25, yPosition);
      yPosition += 10;
      
      doc.text(`Resposta esperada: ${question.expectedAnswer}`, 25, yPosition);
      yPosition += 20;
    });
    
    doc.save(`${title}_resultado.pdf`);
  };

  if (showResults) {
    const { mcScore, totalMCPoints, totalEssayPoints, totalPoints } = calculateScore();
    
    return (
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-display font-bold">Resultado da Prova</h3>
          <Button onClick={exportToPDF} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              Múltipla Escolha: {mcScore}/{totalMCPoints} pontos
              <br />
              Dissertativas: {totalEssayPoints} pontos (correção manual)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold mb-4">Questões de Múltipla Escolha</h4>
              {multipleChoice?.map((question, index) => {
                const userAnswer = mcAnswers[question.id];
                const isCorrect = userAnswer === question.correctAnswer;
                
                return (
                  <div key={question.id} className="border rounded-lg p-4 space-y-3 mb-4">
                    <div className="flex items-start justify-between">
                      <h5 className="font-medium">
                        {index + 1}. {question.question} ({question.points} pontos)
                      </h5>
                      <Badge variant={isCorrect ? "default" : "destructive"}>
                        {isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => (
                        <div 
                          key={optIndex}
                          className={`p-2 rounded text-sm ${
                            optIndex === question.correctAnswer ? 'bg-green-100 text-green-800' :
                            optIndex === userAnswer && !isCorrect ? 'bg-red-100 text-red-800' :
                            'bg-gray-50'
                          }`}
                        >
                          {String.fromCharCode(97 + optIndex)}) {option}
                          {optIndex === question.correctAnswer && <span className="ml-2">✓ Correta</span>}
                          {optIndex === userAnswer && !isCorrect && <span className="ml-2">✗ Sua resposta</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {essays && essays.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold mb-4">Questões Dissertativas</h4>
              {essays.map((question, index) => (
                <div key={question.id} className="border rounded-lg p-4 space-y-3 mb-4">
                  <h5 className="font-medium">
                    {index + 1}. {question.question} ({question.points} pontos)
                  </h5>
                  
                  <div className="space-y-3">
                    <div>
                      <strong>Sua resposta:</strong>
                      <div className="bg-gray-50 p-3 rounded mt-1">
                        {essayAnswers[question.id] || 'Não respondida'}
                      </div>
                    </div>
                    
                    <div>
                      <strong>Resposta esperada:</strong>
                      <div className="bg-blue-50 p-3 rounded mt-1">
                        {question.expectedAnswer}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-display font-bold">{title}</h3>
        <Badge variant="outline">
          Total: {calculateScore().totalPoints} pontos
        </Badge>
      </div>
      
      {/* Multiple Choice Section */}
      <Card>
        <CardHeader>
          <CardTitle>Questões de Múltipla Escolha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {multipleChoice?.map((question, index) => (
            <div key={question.id} className="space-y-3">
              <h4 className="font-medium">
                {index + 1}. {question.question}
                <Badge variant="secondary" className="ml-2">{question.points} pts</Badge>
              </h4>
              
              <div className="space-y-2">
                {question.options.map((option, optIndex) => (
                  <button
                    key={optIndex}
                    onClick={() => handleMCAnswer(question.id, optIndex)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      mcAnswers[question.id] === optIndex 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted border-border'
                    }`}
                  >
                    <span className="font-medium mr-3">
                      {String.fromCharCode(97 + optIndex)})
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      
      {/* Essay Section */}
      {essays && essays.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>Questões Dissertativas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {essays.map((question, index) => (
            <div key={question.id} className="space-y-3">
              <h4 className="font-medium">
                {index + 1}. {question.question}
                <Badge variant="secondary" className="ml-2">{question.points} pts</Badge>
              </h4>
              
              <Textarea
                placeholder="Digite sua resposta aqui..."
                value={essayAnswers[question.id] || ''}
                onChange={(e) => handleEssayAnswer(question.id, e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          ))}
        </CardContent>
      </Card>
      )}
      
      <div className="flex justify-center pt-4">
        <Button 
          onClick={finishExam}
          className="bg-gradient-to-r from-primary to-accent px-8"
          size="lg"
        >
          Finalizar Prova
        </Button>
      </div>
    </div>
  );
};

export default ExamInterface;