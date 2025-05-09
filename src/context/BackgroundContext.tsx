
import React, { createContext, useContext, useState, ReactNode } from 'react';

type BackgroundContextType = {
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
};

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export const BackgroundProvider = ({ children }: { children: ReactNode }) => {
  const [backgroundColor, setBackgroundColor] = useState<string>('bg-attune-blue');

  return (
    <BackgroundContext.Provider value={{ backgroundColor, setBackgroundColor }}>
      {children}
    </BackgroundContext.Provider>
  );
};

export const useBackground = (): BackgroundContextType => {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
};

// Export common background colors for consistent use
export const BACKGROUND_COLORS = {
  BLUE: 'bg-attune-blue',
  VOICE_BLUE: 'bg-attune-deep-blue',
  HOME_BLUE: 'bg-attune-blue',
  CREAM: 'bg-[#EEE0CB]',
  DARK_PURPLE: 'bg-attune-dark-purple'
};
