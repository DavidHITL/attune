
import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useBackground } from '@/context/BackgroundContext';
import AdminPanel from '@/components/AdminPanel';
import AudioContentManager from '@/components/admin/AudioContentManager';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('bot');
  const { setBackgroundColor } = useBackground();
  
  React.useEffect(() => {
    setBackgroundColor('bg-slate-100');
  }, [setBackgroundColor]);
  
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center pt-20 pb-24 px-4">
      <div className="max-w-4xl w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="bg-white p-4 rounded-t-lg">
            <TabsList>
              <TabsTrigger value="bot">Bot Configuration</TabsTrigger>
              <TabsTrigger value="content">Audio Content</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="bot" className="mt-0">
            <div id="admin-panel">
              <AdminPanel />
            </div>
          </TabsContent>
          
          <TabsContent value="content" className="mt-0">
            <AudioContentManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
