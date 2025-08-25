import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Check, X } from 'lucide-react';
import jsPDF from 'jspdf';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizInterfaceProps {
  title: string;
  questions: QuizQuestion[];
}

const QuizInterface: React.FC<QuizInterfaceProps> = ({ title, questions }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const finishQuiz = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(question => {
      if (answers[question.id] === question.correctAnswer) {
        correct++;
      }
    });
    return { correct, total: questions.length };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const { correct, total } = calculateScore();
    
    doc.setFontSize(20);
    doc.text(title, 20, 20);
    doc.setFontSize(14);
    doc.text(`Resultado: ${correct}/${total} (${Math.round((correct/total)*100)}%)`, 20, 35);
    
    let yPosition = 50;
    questions.forEach((question, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer === question.correctAnswer;
      
      doc.setFontSize(12);
      doc.text(`${index + 1}. ${question.question}`, 20, yPosition);
      yPosition += 10;
      
      question.options.forEach((option, optIndex) => {
        const prefix = optIndex === question.correctAnswer ? '✓' : 
                     optIndex === userAnswer && !isCorrect ? '✗' : '';
        doc.text(`${prefix} ${String.fromCharCode(97 + optIndex)}) ${option}`, 25, yPosition);
        yPosition += 7;
      });
      
      doc.text(`Explicação: ${question.explanation}`, 25, yPosition);
      yPosition += 15;
    });
    
    doc.save(`${title}_resultado.pdf`);
  };

  if (showResults) {
    const { correct, total } = calculateScore();
    const percentage = Math.round((correct / total) * 100);
    
    const getScoreColor = (percentage: number) => {
      if (percentage >= 80) return 'text-green-600';
      if (percentage >= 60) return 'text-yellow-600';
      return 'text-red-600';
    };
    
    const getScoreMessage = (percentage: number) => {
      if (percentage >= 90) return 'Excelente! 🎉';
      if (percentage >= 80) return 'Muito bom! 👏';
      if (percentage >= 70) return 'Bom trabalho! 👍';
      if (percentage >= 60) return 'Pode melhorar 📚';
      return 'Precisa estudar mais 💪';
    };
    
    return (
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-display font-bold">Resultado do Quiz</h3>
          <Button onClick={exportToPDF} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-center space-y-2">
              <div className={`text-4xl font-bold ${getScoreColor(percentage)}`}>
                {percentage}%
              </div>
              <div className="text-lg">
                {getScoreMessage(percentage)}
              </div>
              <div className="text-base text-muted-foreground">
                Você acertou {correct} de {total} questões
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((question, index) => {
              const userAnswer = answers[question.id];
              const isCorrect = userAnswer === question.correctAnswer;
              
              return (
                <div key={question.id} className={`border rounded-lg p-4 space-y-3 ${isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium">{index + 1}. {question.question}</h4>
                    <Badge variant={isCorrect ? "default" : "destructive"} className="ml-2">
                      {isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => (
                      <div 
                        key={optIndex}
                        className={`p-3 rounded-lg text-sm border transition-colors ${
                          optIndex === question.correctAnswer ? 'bg-green-100 text-green-800 border-green-300' :
                          optIndex === userAnswer && !isCorrect ? 'bg-red-100 text-red-800 border-red-300' :
                          'bg-gray-50'
                        }`}
                      >
                        <span className="font-medium">{String.fromCharCode(97 + optIndex).toUpperCase()}) </span>{option}
                        {optIndex === question.correctAnswer && <span className="ml-2">✓ Correta</span>}
                        {optIndex === userAnswer && !isCorrect && <span className="ml-2">✗ Sua resposta</span>}
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg text-sm border border-blue-200">
                    <strong>Explicação:</strong> {question.explanation}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const userAnswer = answers[question.id];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-display font-bold">{title}</h3>
        <Badge variant="outline">
          {currentQuestion + 1} de {questions.length}
        </Badge>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{question.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(question.id, index)}
                className={`w-full text-left p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                  userAnswer === index 
                    ? 'bg-primary/10 border-primary shadow-md' 
                    : 'hover:bg-muted border-border hover:border-primary/30'
                }`}
              >
                <span className="font-bold mr-3 text-primary">
                  {String.fromCharCode(97 + index).toUpperCase()})
                </span>
                {option}
              </button>
            ))}
          </div>
          
          <div className="flex justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={prevQuestion}
              disabled={currentQuestion === 0}
            >
              Anterior
            </Button>
            
            {currentQuestion === questions.length - 1 ? (
              <Button 
                onClick={finishQuiz}
                disabled={!answers[question.id] && answers[question.id] !== 0}
                className="bg-gradient-to-r from-primary to-accent"
              >
                Finalizar Quiz
              </Button>
            ) : (
              <Button 
                onClick={nextQuestion}
                disabled={!answers[question.id] && answers[question.id] !== 0}
              >
                Próxima
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizInterface;