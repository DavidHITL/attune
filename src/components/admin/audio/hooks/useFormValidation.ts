
interface FormData {
  title: string;
  audio_url: string;
  [key: string]: any;
}

export function useFormValidation() {
  const validateForm = (formData: FormData): boolean => {
    if (!formData.title) {
      console.error("Error: Title is required");
      return false;
    }
    
    if (!formData.audio_url) {
      console.error("Error: Audio file is required");
      return false;
    }
    
    return true;
  };
  
  return {
    validateForm
  };
}
