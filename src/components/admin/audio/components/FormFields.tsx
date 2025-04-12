
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import FileDropzone from '../../FileDropzone';

interface TitleDescriptionFieldsProps {
  title: string;
  description: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const TitleDescriptionFields: React.FC<TitleDescriptionFieldsProps> = ({
  title,
  description,
  onChange
}) => (
  <>
    <div>
      <label className="block text-sm font-medium mb-1">Title</label>
      <Input
        name="title"
        value={title}
        onChange={onChange}
        required
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium mb-1">Description</label>
      <Textarea
        name="description"
        value={description}
        onChange={onChange}
        rows={3}
      />
    </div>
  </>
);

interface AudioUploadFieldProps {
  onFileUploaded: (url: string, file: File) => void;
  audioFile: File | null;
}

export const AudioUploadField: React.FC<AudioUploadFieldProps> = ({
  onFileUploaded,
  audioFile
}) => (
  <div>
    <label className="block text-sm font-medium mb-1">Upload MP3 File</label>
    <FileDropzone 
      onFileUploaded={onFileUploaded} 
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
);

interface UrlFieldsProps {
  audio_url: string;
  cover_image_url: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UrlFields: React.FC<UrlFieldsProps> = ({
  audio_url,
  cover_image_url,
  onChange
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium mb-1">Audio URL</label>
      <Input
        name="audio_url"
        value={audio_url}
        onChange={onChange}
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
        value={cover_image_url}
        onChange={onChange}
        placeholder="https://example.com/image.jpg"
      />
    </div>
  </div>
);

interface DurationFieldProps {
  duration: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DurationField: React.FC<DurationFieldProps> = ({
  duration,
  onChange
}) => (
  <div>
    <label className="block text-sm font-medium mb-1">Duration (seconds)</label>
    <Input
      type="number"
      name="duration"
      value={duration}
      onChange={onChange}
      min={1}
      required
    />
    <p className="text-xs text-gray-500 mt-1">
      Duration will be auto-detected when you upload a file (if supported by your browser)
    </p>
  </div>
);

interface FeaturedToggleProps {
  is_featured: boolean;
  onToggle: (checked: boolean) => void;
}

export const FeaturedToggle: React.FC<FeaturedToggleProps> = ({
  is_featured,
  onToggle
}) => (
  <div className="flex items-center space-x-2">
    <Switch
      checked={is_featured}
      onCheckedChange={onToggle}
      id="featured"
    />
    <label htmlFor="featured" className="text-sm font-medium">
      Featured Content
    </label>
  </div>
);

interface FormActionButtonsProps {
  isEditing: boolean;
  onCancel?: () => void;
}

export const FormActionButtons: React.FC<FormActionButtonsProps> = ({
  isEditing,
  onCancel
}) => (
  <div className="flex space-x-2">
    <button 
      type="submit" 
      className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    >
      {isEditing ? "Update" : "Add"} Content
    </button>
    
    {isEditing && onCancel && (
      <button 
        type="button" 
        onClick={onCancel}
        className="border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        Cancel
      </button>
    )}
  </div>
);
