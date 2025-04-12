
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTime } from '@/utils/formatters';

interface AudioItem {
  id: string;
  title: string;
  category?: {
    name: string;
  };
  duration: number;
  is_featured: boolean;
  [key: string]: any;
}

interface AudioListProps {
  audioContent: AudioItem[];
  loading: boolean;
  onEdit: (item: AudioItem) => void;
  onDelete: (id: string) => void;
}

const AudioList: React.FC<AudioListProps> = ({
  audioContent,
  loading,
  onEdit,
  onDelete
}) => {
  return (
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
                    <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)}>
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
  );
};

export default AudioList;
