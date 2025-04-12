
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminContentGuide = () => {
  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Adding Content to Your Learn Screen</CardTitle>
        <CardDescription>
          Follow these steps to populate your learn screen with audio content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-medium text-lg">1. Access the Admin Panel</h3>
          <p>
            Navigate to the <Link to="/admin" className="text-blue-600 hover:underline">Admin Panel</Link> and 
            select the "Audio Content" tab.
          </p>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-medium text-lg">2. Add Audio Content</h3>
          <p>
            Use the form to add new audio content with the following information:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Title - The name of your audio content</li>
            <li>Description - A brief description of what the audio contains</li>
            <li>Audio URL - A direct link to the MP3 or other audio file</li>
            <li>Cover Image URL - An optional image to represent the content</li>
            <li>Duration - The length of the audio in seconds</li>
            <li>Category - Select a category to organize your content</li>
          </ul>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-medium text-lg">3. Featured Content</h3>
          <p>
            Toggle the "Featured Content" option to highlight specific audio on the learn page.
          </p>
        </div>
        
        <Link 
          to="/admin?tab=content" 
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          Go to content management <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
};

export default AdminContentGuide;
