
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import VoiceSelector from './VoiceSelector';
import InstructionsEditor from './InstructionsEditor';
import { useBotConfig } from '@/hooks/admin/useBotConfig';

const BotConfigPanel = () => {
  const {
    instructions,
    setInstructions,
    voice,
    setVoice,
    loading,
    saving,
    lastUpdated,
    fetchCurrentConfig,
    updateBotConfig
  } = useBotConfig();

  useEffect(() => {
    fetchCurrentConfig();
    
    // Listen for refresh events from parent component
    const handleRefresh = () => {
      console.log("Refresh event received, fetching current instructions");
      fetchCurrentConfig();
    };
    
    document.getElementById('admin-panel')?.addEventListener('refresh', handleRefresh);
    
    return () => {
      document.getElementById('admin-panel')?.removeEventListener('refresh', handleRefresh);
    };
  }, [fetchCurrentConfig]);

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold text-gray-800">Bot Configuration</h2>
      
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p>Loading configuration...</p>
        </div>
      ) : (
        <>
          <VoiceSelector 
            value={voice} 
            onValueChange={setVoice} 
          />

          <InstructionsEditor 
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            lastUpdated={lastUpdated}
          />
          
          <div className="flex justify-end">
            <Button 
              onClick={updateBotConfig}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Update Configuration'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default BotConfigPanel;
