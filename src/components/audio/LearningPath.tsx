
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface LearningPathProps {
  title: string;
  description?: string;
  totalItems: number;
  completedItems: number;
  onContinue: () => void;
}

const LearningPath: React.FC<LearningPathProps> = ({
  title,
  description,
  totalItems,
  completedItems,
  onContinue
}) => {
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-1 text-sm">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}% Complete</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {completedItems} of {totalItems} lessons completed
            </div>
            <button 
              onClick={onContinue}
              className="bg-black text-white px-4 py-2 rounded-full text-sm hover:bg-gray-800 transition-colors"
            >
              {completedItems > 0 ? "Continue Learning" : "Start Learning"}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LearningPath;
