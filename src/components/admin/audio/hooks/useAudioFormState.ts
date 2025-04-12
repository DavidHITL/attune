
import { useState, useEffect } from 'react';

export interface AudioFormData {
  title: string;
  description: string;
  audio_url: string;
  cover_image_url: string;
  duration: number;
  is_featured: boolean;
  rank: number;
}

interface UseAudioFormStateProps {
  initialData?: any;
}

export function useAudioFormState({ initialData }: UseAudioFormStateProps) {
  const [formData, setFormData] = useState<AudioFormData>({
    title: '',
    description: '',
    audio_url: '',
    cover_image_url: '',
    duration: 0,
    is_featured: false,
    rank: 0
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        audio_url: initialData.audio_url || '',
        cover_image_url: initialData.cover_image_url || '',
        duration: initialData.duration || 0,
        is_featured: initialData.is_featured || false,
        rank: initialData.rank || 0
      });
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData({
      ...formData,
      is_featured: checked
    });
  };
  
  const updateFormData = (updates: Partial<AudioFormData>) => {
    setFormData(prevData => ({
      ...prevData,
      ...updates
    }));
  };
  
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      audio_url: '',
      cover_image_url: '',
      duration: 0,
      is_featured: false,
      rank: 0
    });
  };

  return {
    formData,
    handleInputChange,
    handleSwitchChange,
    updateFormData,
    resetForm
  };
}
