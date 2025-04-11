
import React, { useRef, useEffect } from 'react';
import { Message } from '@/utils/types';

interface ConversationHistoryProps {
  messages: Message[];
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (messages.length === 0) return null;
  
  return (
    <div className="mb-8 mt-4 max-h-60 overflow-y-auto border border-attune-blue/30 rounded-lg p-4 bg-attune-blue/10">
      <h3 className="text-sm font-sans font-medium mb-2 text-black">
        Recent Conversation History
        {messages.length > 10 && ` (showing all ${messages.length} messages)`}
      </h3>
      {messages.map((msg, index) => (
        <div key={msg.id || index} className={`mb-3 ${msg.role === 'user' ? 'text-right' : ''}`}>
          <span className="text-xs font-sans text-black block mb-1">
            {msg.role === 'user' ? 'You' : 'Assistant'}
          </span>
          <div className={`inline-block rounded-lg px-3 py-2 text-sm font-sans max-w-[85%] ${
            msg.role === 'user' 
              ? 'bg-attune-purple/20 text-black' 
              : 'bg-attune-blue/30 text-black'
          }`}>
            {msg.content}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ConversationHistory;
