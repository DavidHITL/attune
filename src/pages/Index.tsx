
import React, { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';
import AttuneContent from '@/components/AttuneContent';
import { useBackground, BACKGROUND_COLORS } from '@/context/BackgroundContext';
import { useAuth } from '@/context/AuthContext';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import FeaturedAudio from '@/components/audio/FeaturedAudio';
import AudioGrid from '@/components/audio/AudioGrid';
import AudioPlayer from '@/components/audio/AudioPlayer';
import LearningPath from '@/components/audio/LearningPath';

const Index = () => {
  const {
    setBackgroundColor
  } = useBackground();
  const {
    user
  } = useAuth();
  const {
    loading,
    featuredContent,
    audioContent,
    categories,
    updateProgress
  } = useAudioLibrary();
  const [playingAudio, setPlayingAudio] = useState<any>(null);

  // Group audio content by categories
  const audioByCategory = React.useMemo(() => {
    if (!categories || !audioContent) return {};
    
    return audioContent.reduce((acc: Record<string, any[]>, audio) => {
      const categoryId = audio.category_id || 'uncategorized';
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(audio);
      return acc;
    }, {});
  }, [audioContent, categories]);

  // Calculate progress for each category
  const categoryProgress = React.useMemo(() => {
    if (!categories || !audioContent) return {};
    
    return Object.entries(audioByCategory).reduce((acc: Record<string, {total: number, completed: number}>, [categoryId, items]) => {
      acc[categoryId] = {
        total: items.length,
        completed: items.filter(item => item.progress?.completed).length
      };
      return acc;
    }, {});
  }, [audioByCategory]);

  useEffect(() => {
    // Always use cream background for this page
    setBackgroundColor(BACKGROUND_COLORS.CREAM);
  }, [setBackgroundColor]);

  const handlePlayAudio = (audioItem: any) => {
    setPlayingAudio(audioItem);
    toast({
      title: 'Now playing',
      description: audioItem.title
    });
  };

  const handleProgressUpdate = (seconds: number) => {
    if (!playingAudio) return;
    updateProgress(playingAudio.id, seconds);
  };

  const handleComplete = () => {
    if (!playingAudio) return;
    updateProgress(playingAudio.id, playingAudio.duration, true);
    toast({
      title: 'Completed',
      description: `You've completed ${playingAudio.title}`
    });
  };
  
  const navigateToCategory = (categoryId: string) => {
    // For now, just play the first item in the category
    const items = audioByCategory[categoryId];
    if (items && items.length > 0) {
      handlePlayAudio(items[0]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 pb-24 text-black font-sans bg-[#EEE0CB]">
      <Toaster />
      <div className="w-full max-w-[800px]">
        {user ? !loading ? (
          <>
            {/* Featured Content - Introductory Course */}
            {featuredContent && (
              <FeaturedAudio 
                id={featuredContent.id} 
                title="INTRODUCTORY COURSE" 
                duration={featuredContent.duration} 
                onPlay={() => handlePlayAudio(featuredContent)} 
              />
            )}
            
            {/* Learning Paths - Grouped by category */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Learning Paths</h2>
              {categories && categories.map(category => {
                const progress = categoryProgress[category.id] || { total: 0, completed: 0 };
                const items = audioByCategory[category.id] || [];
                
                if (items.length === 0) return null;
                
                return (
                  <LearningPath
                    key={category.id}
                    title={category.name}
                    description={`${items.length} audio lessons`}
                    totalItems={progress.total}
                    completedItems={progress.completed}
                    onContinue={() => navigateToCategory(category.id)}
                  />
                );
              })}
            </div>
            
            {/* Audio List */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg">
              <h2 className="text-xl font-bold p-4">All Audio Content</h2>
              <AudioGrid 
                items={audioContent.map(audio => ({
                  ...audio,
                  progress: audio.progress?.progress_seconds
                }))} 
                onSelectAudio={(id) => {
                  const audio = audioContent.find(item => item.id === id);
                  if (audio) handlePlayAudio(audio);
                }} 
              />
            </div>
            
            {/* Audio Player */}
            {playingAudio && (
              <AudioPlayer 
                title={playingAudio.title} 
                audioUrl={playingAudio.audio_url} 
                coverImage={playingAudio.cover_image_url} 
                initialProgress={playingAudio.progress?.progress_seconds || 0} 
                onClose={() => setPlayingAudio(null)} 
                onProgressUpdate={handleProgressUpdate} 
                onComplete={handleComplete}
              />
            )}
          </>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p className="text-black">Loading audio library...</p>
          </div>
        ) : (
          <AttuneContent />
        )}
      </div>
    </div>
  );
};

export default Index;
