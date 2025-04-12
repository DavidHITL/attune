
import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useBackground } from '@/context/BackgroundContext';
import AdminPanel from '@/components/AdminPanel';
import AudioContentManager from '@/components/admin/AudioContentManager';
import { useLocation, useNavigate } from 'react-router-dom';

const Admin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(tabParam === 'content' ? 'content' : 'bot');
  const { setBackgroundColor } = useBackground();
  
  useEffect(() => {
    setBackgroundColor('bg-slate-100');
  }, [setBackgroundColor]);
  
  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/admin?tab=${value}`, { replace: true });
  };
  
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center pt-20 pb-24 px-4">
      <div className="max-w-4xl w-full">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
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
