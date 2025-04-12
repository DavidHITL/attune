
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileDropzoneProps {
  onFileUploaded: (url: string, file: File) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  bucketName?: string;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileUploaded,
  accept = { 'audio/mpeg': ['.mp3'] },
  maxSize = 10485760, // 10MB default
  bucketName = 'audio_files'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(0);
      
      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload the file
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      setUploadProgress(100);
      
      onFileUploaded(publicUrl, file);
      
      toast({
        title: "Upload successful",
        description: "Audio file has been uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsUploading(false);
    }
  }, [bucketName, onFileUploaded, toast]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false
  });

  // Handle file rejection reasons
  const fileRejectionItems = fileRejections.map(({ file, errors }) => (
    <li key={file.name}>
      <p>{file.name} - {file.size} bytes</p>
      <ul>
        {errors.map(e => (
          <li key={e.code}>{e.message}</li>
        ))}
      </ul>
    </li>
  ));

  return (
    <div className="mb-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
        }`}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="flex flex-col items-center justify-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Uploading... {uploadProgress > 0 ? `${uploadProgress}%` : ''}</p>
          </div>
        ) : uploadError ? (
          <div className="flex flex-col items-center justify-center space-y-2">
            <XCircle className="h-8 w-8 text-red-500" />
            <p className="text-red-500">{uploadError}</p>
            <p className="text-sm text-gray-500">Click or drag to try again</p>
          </div>
        ) : uploadProgress === 100 ? (
          <div className="flex flex-col items-center justify-center space-y-2">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <p className="text-green-500">Upload complete!</p>
            <p className="text-sm text-gray-500">Click or drag to upload another file</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="h-8 w-8 text-gray-500" />
            <p>Drop MP3 file here, or click to select</p>
            <p className="text-sm text-gray-500">MP3 files only, up to {Math.round(maxSize / 1048576)}MB</p>
          </div>
        )}
      </div>
      
      {fileRejectionItems.length > 0 && (
        <ul className="mt-2 text-sm text-red-500">
          {fileRejectionItems}
        </ul>
      )}
    </div>
  );
};

export default FileDropzone;
