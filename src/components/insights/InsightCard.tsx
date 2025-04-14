
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  variant?: 'default' | 'triggers' | 'strategies' | 'suggestions';
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  className?: string;
}

const InsightCard = ({
  title,
  description,
  children,
  variant = 'default',
  icon: Icon = Info,
  className,
}: InsightCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'triggers':
        return {
          gradientClass: 'from-orange-500/10 to-red-500/5',
          iconClass: 'text-orange-500',
          iconComponent: AlertTriangle
        };
      case 'strategies':
        return {
          gradientClass: 'from-purple-500/10 to-blue-500/5',
          iconClass: 'text-purple-500',
          iconComponent: Info
        };
      case 'suggestions':
        return {
          gradientClass: 'from-emerald-500/10 to-teal-500/5',
          iconClass: 'text-emerald-500',
          iconComponent: Sparkles
        };
      default:
        return {
          gradientClass: 'from-blue-500/10 to-indigo-500/5',
          iconClass: 'text-blue-500',
          iconComponent: Icon
        };
    }
  };

  const { gradientClass, iconClass, iconComponent: VariantIcon } = getVariantStyles();
  const IconComponent = Icon !== Info ? Icon : VariantIcon;

  return (
    <Card className={cn(
      "overflow-hidden border border-white/10 shadow-md bg-gradient-to-br", 
      gradientClass,
      className
    )}>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <div className={cn("p-1.5 rounded-full bg-white/10", iconClass)}>
          <IconComponent className="h-4 w-4" />
        </div>
        <div>
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          {description && (
            <CardDescription className="text-sm text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default InsightCard;
