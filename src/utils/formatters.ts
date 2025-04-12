
/**
 * Format seconds into MM:SS or HH:MM:SS format
 */
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
  
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

/**
 * Format a date into a readable string
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Get audio duration from a file
 */
export const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio();
      audio.preload = 'metadata';
      
      const reader = new FileReader();
      reader.onload = (e) => {
        audio.src = e.target?.result as string;
        audio.addEventListener('loadedmetadata', () => {
          if (audio.duration && !isNaN(audio.duration)) {
            resolve(Math.round(audio.duration));
          } else {
            reject(new Error('Could not determine audio duration'));
          }
        });
        audio.addEventListener('error', () => {
          reject(new Error('Error loading audio file'));
        });
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    } catch (error) {
      reject(error);
    }
  });
};
