
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface FileDropzoneProps {
  onFileUploaded: (url: string, file: File) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  bucketName?: string;
  storagePath?: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileUploaded,
  accept,
  maxSize = 10485760, // 10MB default
  bucketName = 'audio_files',
  storagePath = '',
  label = 'Drop file here, or click to select',
  description,
  className = '',
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
      const filePath = `${storagePath}${fileName}`;

      console.log(`Uploading to bucket: ${bucketName}, path: ${filePath}`);

      // Check if bucket exists, if not we'll get an error during upload
      const { data: bucketData, error: bucketError } = await supabase.storage
        .getBucket(bucketName);

      if (bucketError) {
        console.error('Error checking bucket existence:', bucketError);
        throw new Error(`Bucket "${bucketName}" not found. Please create it in Supabase.`);
      }

      console.log('Bucket exists, proceeding with upload');

      // Upload the file
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      console.log('File uploaded successfully:', data);

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      setUploadProgress(100);
      
      console.log('Public URL generated:', publicUrl);
      
      onFileUploaded(publicUrl, file);
      
      toast({
        title: "Upload successful",
        description: "File has been uploaded successfully",
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
  }, [bucketName, onFileUploaded, toast, storagePath]);

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

  // Get file format description based on accept prop
  const getFileTypeDescription = () => {
    if (!accept) return "All files";
    
    const types = Object.keys(accept).map(type => {
      // Get the general type (image, audio, video, etc.)
      const generalType = type.split('/')[0];
      return generalType.charAt(0).toUpperCase() + generalType.slice(1);
    });
    
    // Remove duplicates
    const uniqueTypes = [...new Set(types)];
    return uniqueTypes.join('/') + " files";
  };

  // Get size description
  const getSizeDescription = () => {
    if (!maxSize) return "";
    return `up to ${Math.round(maxSize / 1048576)}MB`;
  };

  // Default description if none provided
  const defaultDescription = description || (
    <>
      {getFileTypeDescription()} {getSizeDescription() && `, ${getSizeDescription()}`}
    </>
  );

  return (
    <div className={`mb-4 ${className}`}>
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
            <p>{label}</p>
            <p className="text-sm text-gray-500">{defaultDescription}</p>
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
