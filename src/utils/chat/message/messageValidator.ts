
export const isValidMessageContent = (content?: string): boolean => {
  return !!content && content.trim() !== '';
};

export const getMessagePreview = (content: string, maxLength: number = 30): string => {
  return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
};
