
import React from 'react';
import { useAudioContent } from './audio/useAudioContent';
import AudioForm from './audio/AudioForm';
import AudioList from './audio/AudioList';

const AudioContentManager = () => {
  const {
    loading,
    audioContent,
    isEditing,
    currentItem,
    fetchData,
    handleEdit,
    handleDelete,
    resetForm,
    moveItemUp,
    moveItemDown
  } = useAudioContent();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">
          {isEditing ? "Edit Audio Content" : "Add New Audio Content"}
        </h2>
        
        <AudioForm
          initialData={currentItem}
          isEditing={isEditing}
          onSubmitSuccess={() => {
            resetForm();
            fetchData();
          }}
          onCancel={resetForm}
        />
      </div>
      
      <AudioList
        audioContent={audioContent}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onMoveUp={moveItemUp}
        onMoveDown={moveItemDown}
      />
    </div>
  );
};

export default AudioContentManager;
