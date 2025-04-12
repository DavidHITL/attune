import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { formatTime } from '@/utils/formatters';
import FileDropzone from './FileDropzone';

const AudioContentManager = () => {
  const [loading, setLoading] = useState(true);
  const [audioContent, setAudioContent] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    audio_url: '',
    cover_image_url: '',
    duration: 0,
    category_id: '',
    is_featured: false
  });
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      setCategories(categoriesData || []);
      
      // Fetch audio content
      const { data: contentData } = await supabase
        .from('audio_content')
        .select(`
          *,
          category:categories(name)
        `)
        .order('title');
      
      setAudioContent(contentData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load data"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData({
      ...formData,
      is_featured: checked
    });
  };

  const handleCategoryChange = (value: string) => {
    setFormData({
      ...formData,
      category_id: value
    });
  };

  const handleAudioUploaded = (url: string, file: File) => {
    setAudioFile(file);
    setFormData({
      ...formData,
      audio_url: url
    });
    
    // Try to get audio duration if possible
    if (window.Audio) {
      const audio = new Audio();
      audio.src = url;
      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setFormData(prev => ({
            ...prev,
            duration: Math.round(audio.duration)
          }));
        }
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      audio_url: '',
      cover_image_url: '',
      duration: 0,
      category_id: '',
      is_featured: false
    });
    setIsEditing(false);
    setCurrentId(null);
    setAudioFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && currentId) {
        // Update existing content
        const { error } = await supabase
          .from('audio_content')
          .update(formData)
          .eq('id', currentId);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Audio content updated successfully"
        });
      } else {
        // Create new content
        const { error } = await supabase
          .from('audio_content')
          .insert([formData]);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "New audio content added"
        });
      }
      
      // Refresh data and reset form
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save data"
      });
    }
  };

  const handleEdit = (item: any) => {
    setFormData({
      title: item.title,
      description: item.description || '',
      audio_url: item.audio_url,
      cover_image_url: item.cover_image_url || '',
      duration: item.duration,
      category_id: item.category_id || '',
      is_featured: item.is_featured
    });
    setIsEditing(true);
    setCurrentId(item.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    
    try {
      const { error } = await supabase
        .from('audio_content')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Audio content deleted"
      });
      
      fetchData();
    } catch (error) {
      console.error("Error deleting data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete data"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">
          {isEditing ? "Edit Audio Content" : "Add New Audio Content"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Upload MP3 File</label>
            <FileDropzone onFileUploaded={handleAudioUploaded} />
            {audioFile && (
              <div className="mt-2 text-sm text-gray-500">
                Selected file: {audioFile.name} ({Math.round(audioFile.size / 1024)} KB)
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Audio URL</label>
              <Input
                name="audio_url"
                value={formData.audio_url}
                onChange={handleInputChange}
                placeholder="https://example.com/audio.mp3"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                URL will be auto-filled when you upload a file using the dropzone
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Cover Image URL</label>
              <Input
                name="cover_image_url"
                value={formData.cover_image_url}
                onChange={handleInputChange}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Duration (seconds)</label>
              <Input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                min={1}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Duration will be auto-detected when you upload a file (if supported by your browser)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Select
                value={formData.category_id}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.is_featured}
              onCheckedChange={handleSwitchChange}
              id="featured"
            />
            <label htmlFor="featured" className="text-sm font-medium">
              Featured Content
            </label>
          </div>
          
          <div className="flex space-x-2">
            <Button type="submit">
              {isEditing ? "Update" : "Add"} Content
            </Button>
            
            {isEditing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
        <h2 className="text-xl font-bold mb-4">Audio Content Library</h2>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audioContent.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>{item.category?.name || '-'}</TableCell>
                  <TableCell>{formatTime(item.duration)}</TableCell>
                  <TableCell>{item.is_featured ? '✓' : '-'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default AudioContentManager;
