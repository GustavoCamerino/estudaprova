import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LifeArea {
  id: string;
  name: string;
  score: number;
  color: string;
  icon: string;
}

const LifeWheel = () => {
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([
    { id: '1', name: 'Carreira', score: 7, color: '#4ade80', icon: '💼' },
    { id: '2', name: 'Saúde', score: 8, color: '#22c55e', icon: '💪' },
    { id: '3', name: 'Família', score: 9, color: '#16a34a', icon: '👨‍👩‍👧‍👦' },
    { id: '4', name: 'Relacionamentos', score: 6, color: '#15803d', icon: '❤️' },
    { id: '5', name: 'Finanças', score: 5, color: '#166534', icon: '💰' },
    { id: '6', name: 'Crescimento', score: 8, color: '#14532d', icon: '📚' },
    { id: '7', name: 'Diversão', score: 4, color: '#052e16', icon: '🎉' },
    { id: '8', name: 'Ambiente', score: 7, color: '#064e3b', icon: '🏠' }
  ]);

  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const centerX = 150;
  const centerY = 150;
  const radius = 120;
  const innerRadius = 30;

  const angleStep = (2 * Math.PI) / lifeAreas.length;

  const getCoordinates = (index: number, r: number) => {
    const angle = index * angleStep - Math.PI / 2;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    };
  };

  const createArcPath = (index: number, score: number) => {
    const startAngle = index * angleStep - Math.PI / 2;
    const endAngle = (index + 1) * angleStep - Math.PI / 2;
    const scoreRadius = innerRadius + (score / 10) * (radius - innerRadius);
    
    const startOuter = getCoordinates(index, scoreRadius);
    const endOuter = getCoordinates(index + 1, scoreRadius);
    const startInner = getCoordinates(index, innerRadius);
    const endInner = getCoordinates(index + 1, innerRadius);
    
    const largeArcFlag = angleStep > Math.PI ? 1 : 0;
    
    return `
      M ${startInner.x} ${startInner.y}
      L ${startOuter.x} ${startOuter.y}
      A ${scoreRadius} ${scoreRadius} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}
      L ${endInner.x} ${endInner.y}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInner.x} ${startInner.y}
    `;
  };

  const updateScore = (id: string, newScore: number) => {
    setLifeAreas(prev => prev.map(area => 
      area.id === id ? { ...area, score: Math.max(0, Math.min(10, newScore)) } : area
    ));
  };

  const averageScore = lifeAreas.reduce((sum, area) => sum + area.score, 0) / lifeAreas.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-display">Roda da Vida</CardTitle>
        <CardDescription>
          Avalie diferentes áreas da sua vida em uma escala de 0 a 10
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Wheel SVG */}
          <div className="flex justify-center">
            <div className="relative">
              <svg width="300" height="300" className="drop-shadow-lg">
                {/* Background circles */}
                {[2, 4, 6, 8, 10].map(level => (
                  <circle
                    key={level}
                    cx={centerX}
                    cy={centerY}
                    r={innerRadius + (level / 10) * (radius - innerRadius)}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="1"
                    opacity="0.3"
                  />
                ))}
                
                {/* Area segments */}
                {lifeAreas.map((area, index) => (
                  <g key={area.id}>
                    {/* Segment path */}
                    <path
                      d={createArcPath(index, area.score)}
                      fill={area.color}
                      opacity={selectedArea === area.id ? 0.8 : 0.6}
                      stroke="white"
                      strokeWidth="2"
                      className="cursor-pointer transition-all duration-300 hover:opacity-80"
                      onClick={() => setSelectedArea(selectedArea === area.id ? null : area.id)}
                    />
                    
                    {/* Area labels */}
                    <text
                      x={getCoordinates(index + 0.5, radius + 20).x}
                      y={getCoordinates(index + 0.5, radius + 20).y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs font-medium fill-current"
                      style={{ fontSize: '11px' }}
                    >
                      {area.name}
                    </text>
                    
                    {/* Score labels */}
                    <text
                      x={getCoordinates(index + 0.5, innerRadius + (area.score / 10) * (radius - innerRadius) / 2).x}
                      y={getCoordinates(index + 0.5, innerRadius + (area.score / 10) * (radius - innerRadius) / 2).y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-sm font-bold fill-white"
                    >
                      {area.score}
                    </text>
                  </g>
                ))}
                
                {/* Center circle with average */}
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={innerRadius}
                  fill="hsl(var(--primary))"
                  stroke="white"
                  strokeWidth="3"
                />
                <text
                  x={centerX}
                  y={centerY - 5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-medium fill-white"
                >
                  Média
                </text>
                <text
                  x={centerX}
                  y={centerY + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-lg font-bold fill-white"
                >
                  {averageScore.toFixed(1)}
                </text>
              </svg>
            </div>
          </div>
          
          {/* Area Controls */}
          <div className="flex-1 space-y-3">
            <h3 className="text-lg font-semibold mb-4">Ajustar Pontuações</h3>
            {lifeAreas.map((area) => (
              <div
                key={area.id}
                className={`p-3 rounded-lg border transition-all duration-200 ${
                  selectedArea === area.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{area.icon}</span>
                    <span className="font-medium">{area.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {area.score}/10
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateScore(area.id, area.score - 1)}
                    className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-sm font-bold transition-colors"
                  >
                    -
                  </button>
                  
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${(area.score / 10) * 100}%`,
                        backgroundColor: area.color
                      }}
                    />
                  </div>
                  
                  <button
                    onClick={() => updateScore(area.id, area.score + 1)}
                    className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-sm font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            
            <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
              <h4 className="font-semibold mb-2">Insights da Roda da Vida</h4>
              <p className="text-sm text-muted-foreground">
                Sua pontuação média é <strong>{averageScore.toFixed(1)}</strong>. 
                Áreas com pontuação baixa podem precisar de mais atenção para melhorar 
                seu equilíbrio de vida geral.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LifeWheel;