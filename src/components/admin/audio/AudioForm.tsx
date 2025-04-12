
import React from 'react';
import { Button } from '@/components/ui/button';
import { useFormValidation } from './hooks/useFormValidation';
import { useAudioFormState } from './hooks/useAudioFormState';
import { useAudioFormSubmit } from './hooks/useAudioFormSubmit';
import { useAudioUpload } from './hooks/useAudioUpload';
import {
  TitleDescriptionFields,
  AudioUploadField,
  UrlFields,
  DurationField,
  FeaturedToggle
} from './components/FormFields';

interface AudioFormProps {
  initialData?: any;
  isEditing: boolean;
  onSubmitSuccess: () => void;
  onCancel?: () => void;
}

const AudioForm: React.FC<AudioFormProps> = ({
  initialData,
  isEditing,
  onSubmitSuccess,
  onCancel
}) => {
  const { 
    formData, 
    handleInputChange, 
    handleSwitchChange, 
    updateFormData,
    resetForm 
  } = useAudioFormState({ initialData });
  
  const { audioFile, handleAudioUploaded } = useAudioUpload(updateFormData);
  const { validateForm } = useFormValidation();
  const { handleSubmit } = useAudioFormSubmit({ isEditing, initialData, onSubmitSuccess });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(formData)) {
      return;
    }
    
    await handleSubmit(formData, () => {
      resetForm();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <TitleDescriptionFields
        title={formData.title}
        description={formData.description}
        onChange={handleInputChange}
      />
      
      <AudioUploadField
        onFileUploaded={handleAudioUploaded}
        audioFile={audioFile}
      />
      
      <UrlFields
        audio_url={formData.audio_url}
        cover_image_url={formData.cover_image_url}
        onChange={handleInputChange}
      />
      
      <DurationField
        duration={formData.duration}
        onChange={handleInputChange}
      />
      
      <FeaturedToggle
        is_featured={formData.is_featured}
        onToggle={handleSwitchChange}
      />
      
      <div className="flex space-x-2">
        <Button type="submit">
          {isEditing ? "Update" : "Add"} Content
        </Button>
        
        {isEditing && onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};

export default AudioForm;
