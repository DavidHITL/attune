
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AudioFormData } from './useAudioFormState';

interface UseAudioFormSubmitProps {
  isEditing: boolean;
  initialData?: any;
  onSubmitSuccess: () => void;
}

export function useAudioFormSubmit({
  isEditing,
  initialData,
  onSubmitSuccess
}: UseAudioFormSubmitProps) {
  const { toast } = useToast();
  
  const handleSubmit = async (formData: AudioFormData, resetForm: () => void) => {
    try {
      console.log("Submitting form data:", formData);
      
      if (isEditing && initialData?.id) {
        // Update existing content
        const { error } = await supabase
          .from('audio_content')
          .update(formData)
          .eq('id', initialData.id);
        
        if (error) {
          console.error("Error updating audio content:", error);
          throw error;
        }
        
        toast({
          title: "Success",
          description: "Audio content updated successfully"
        });
      } else {
        // Get the highest rank and add 1
        const { data: maxRankData } = await supabase
          .from('audio_content')
          .select('rank')
          .order('rank', { ascending: false })
          .limit(1)
          .single();
        
        const newRank = maxRankData ? maxRankData.rank + 1 : 1;
        
        // Create new content with the new rank
        const { error } = await supabase
          .from('audio_content')
          .insert([{...formData, rank: newRank}]);
        
        if (error) {
          console.error("Error creating audio content:", error);
          throw error;
        }
        
        toast({
          title: "Success",
          description: "New audio content added"
        });
      }
      
      // Reset form and notify parent
      resetForm();
      onSubmitSuccess();
      
    } catch (error) {
      console.error("Error saving data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save data: " + (error instanceof Error ? error.message : "Unknown error")
      });
    }
  };
  
  return { handleSubmit };
}
