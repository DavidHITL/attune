
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
import { ArrowUp, ArrowDown } from 'lucide-react';

interface AudioItem {
  id: string;
  title: string;
  duration: number;
  is_featured: boolean;
  rank: number;
  [key: string]: any;
}

interface AudioListProps {
  audioContent: AudioItem[];
  loading: boolean;
  onEdit: (item: AudioItem) => void;
  onDelete: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

const AudioList: React.FC<AudioListProps> = ({
  audioContent,
  loading,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown
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
              <TableHead>Rank</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audioContent.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-2">
                    <span>{item.rank}</span>
                    <div className="flex flex-col">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onMoveUp(index)} 
                        disabled={index === 0}
                        className="h-6 w-6"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onMoveDown(index)} 
                        disabled={index === audioContent.length - 1}
                        className="h-6 w-6"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{item.title}</TableCell>
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
