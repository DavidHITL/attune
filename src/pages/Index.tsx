
import React, { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';
import AttuneContent from '@/components/AttuneContent';
import { useBackground } from '@/context/BackgroundContext';
import { useAuth } from '@/context/AuthContext';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import FeaturedAudio from '@/components/audio/FeaturedAudio';
import AudioGrid from '@/components/audio/AudioGrid';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const { setBackgroundColor } = useBackground();
  const { user } = useAuth();
  const { 
    loading, 
    featuredContent, 
    audioContent, 
    categories, 
    updateProgress 
  } = useAudioLibrary();
  
  const [activeTab, setActiveTab] = useState<string>("all");
  const [playingAudio, setPlayingAudio] = useState<any>(null);

  useEffect(() => {
    setBackgroundColor('bg-attune-blue');
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
  
  const filteredContent = activeTab === "all" 
    ? audioContent 
    : audioContent.filter(item => item.category_id === activeTab);

  return (
    <div className="min-h-screen bg-attune-blue flex flex-col items-center py-12 px-4 pb-24">
      <Toaster />
      <div className="w-full max-w-[800px]">
        {user ? (
          !loading ? (
            <>
              {/* Featured Content */}
              {featuredContent && (
                <FeaturedAudio
                  id={featuredContent.id}
                  title={featuredContent.title}
                  description={featuredContent.description}
                  duration={featuredContent.duration}
                  imageUrl={featuredContent.cover_image_url}
                  progress={featuredContent.progress?.progress_seconds}
                  onPlay={() => handlePlayAudio(featuredContent)}
                />
              )}
              
              {/* Category Tabs */}
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
                <TabsList className="bg-white/10">
                  <TabsTrigger value="all">All</TabsTrigger>
                  {categories.map(category => (
                    <TabsTrigger key={category.id} value={category.id}>
                      {category.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                <TabsContent value="all" className="mt-4">
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
                </TabsContent>
                
                {categories.map(category => (
                  <TabsContent key={category.id} value={category.id} className="mt-4">
                    <AudioGrid 
                      items={filteredContent.map(audio => ({
                        ...audio,
                        progress: audio.progress?.progress_seconds
                      }))}
                      onSelectAudio={(id) => {
                        const audio = filteredContent.find(item => item.id === id);
                        if (audio) handlePlayAudio(audio);
                      }}
                    />
                  </TabsContent>
                ))}
              </Tabs>
              
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
              <p className="text-white/70">Loading audio library...</p>
            </div>
          )
        ) : (
          <AttuneContent />
        )}
      </div>
    </div>
  );
};

export default Index;
