
import { useToast } from '@/hooks/use-toast';

interface FormData {
  title: string;
  audio_url: string;
  [key: string]: any;
}

export function useFormValidation() {
  const { toast } = useToast();
  
  const validateForm = (formData: FormData): boolean => {
    if (!formData.title) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Title is required"
      });
      return false;
    }
    
    if (!formData.audio_url) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Audio file is required"
      });
      return false;
    }
    
    return true;
  };
  
  return {
    validateForm
  };
}
