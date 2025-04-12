
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import FileDropzone from '../FileDropzone';

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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    audio_url: '',
    cover_image_url: '',
    duration: 0,
    is_featured: false,
    rank: 0
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const { toast } = useToast();

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

  const handleAudioUploaded = (url: string, file: File) => {
    console.log("Audio file uploaded successfully:", url);
    setAudioFile(file);
    setFormData({
      ...formData,
      audio_url: url
    });
    
    // Try to get audio duration if possible
    if (window.Audio) {
      const audio = new Audio();
      audio.src = url;
      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setFormData(prev => ({
            ...prev,
            duration: Math.round(audio.duration)
          }));
        }
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Title is required"
      });
      return;
    }
    
    if (!formData.audio_url) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Audio file is required"
      });
      return;
    }
    
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
      setFormData({
        title: '',
        description: '',
        audio_url: '',
        cover_image_url: '',
        duration: 0,
        is_featured: false,
        rank: 0
      });
      setAudioFile(null);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <Input
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <Textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Upload MP3 File</label>
        <FileDropzone 
          onFileUploaded={handleAudioUploaded} 
          accept={{ 'audio/mpeg': ['.mp3'] }}
          bucketName="audio_files"
          label="Drop MP3 file here, or click to select"
        />
        {audioFile && (
          <div className="mt-2 text-sm text-gray-500">
            Selected file: {audioFile.name} ({Math.round(audioFile.size / 1024)} KB)
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Audio URL</label>
          <Input
            name="audio_url"
            value={formData.audio_url}
            onChange={handleInputChange}
            placeholder="https://example.com/audio.mp3"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            URL will be auto-filled when you upload a file using the dropzone
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Cover Image URL</label>
          <Input
            name="cover_image_url"
            value={formData.cover_image_url}
            onChange={handleInputChange}
            placeholder="https://example.com/image.jpg"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Duration (seconds)</label>
        <Input
          type="number"
          name="duration"
          value={formData.duration}
          onChange={handleInputChange}
          min={1}
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Duration will be auto-detected when you upload a file (if supported by your browser)
        </p>
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.is_featured}
          onCheckedChange={handleSwitchChange}
          id="featured"
        />
        <label htmlFor="featured" className="text-sm font-medium">
          Featured Content
        </label>
      </div>
      
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
