
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import { 
  ChartContainer,
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import { UserInsight } from '@/utils/types';
import { formatStrategy } from '@/hooks/useTerryRealInsights';

interface StrategiesChartProps {
  insights: UserInsight | null;
}

const StrategiesChart = ({ insights }: StrategiesChartProps) => {
  if (!insights || !insights.losing_strategies.scores) return null;
  
  const { scores } = insights.losing_strategies;
  
  const data = [
    { name: 'beingRight', value: scores.beingRight, label: 'Being Right', color: '#9b87f5' },
    { name: 'control', value: scores.control, label: 'Control', color: '#8B5CF6' },
    { name: 'unbridledExpression', value: scores.unbridledExpression, label: 'Unbridled Expression', color: '#7E69AB' },
    { name: 'retaliation', value: scores.retaliation, label: 'Retaliation', color: '#D946EF' },
    { name: 'withdrawal', value: scores.withdrawal, label: 'Withdrawal', color: '#6E59A5' }
  ].sort((a, b) => b.value - a.value); // Sort from highest to lowest
  
  const primaryStrategy = insights.losing_strategies.primary;
  
  // Chart config that maps data keys to colors
  const chartConfig = data.reduce((config, item) => {
    config[item.name] = {
      label: item.label,
      color: item.color,
    };
    return config;
  }, {} as Record<string, { label: string; color: string }>);
  
  return (
    <div className="w-full h-56 py-4">
      <ChartContainer config={chartConfig} className="h-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
          >
            <XAxis 
              type="number" 
              domain={[0, 10]} 
              tickCount={6}
              tick={{ fill: '#9f9ea1', fontSize: 11 }}
              axisLine={{ stroke: '#222222' }}
            />
            <YAxis 
              type="category" 
              dataKey="label" 
              tick={{ fill: '#ffffff', fontSize: 12 }}
              width={100}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" minPointSize={2} radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.name === primaryStrategy ? entry.color : `${entry.color}90`}
                  stroke={entry.name === primaryStrategy ? '#ffffff20' : 'none'}
                  strokeWidth={2}
                />
              ))}
              <LabelList 
                dataKey="value" 
                position="right" 
                fill="#ffffff" 
                fontSize={11} 
                formatter={(value: number) => `${value}/10`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export default StrategiesChart;
