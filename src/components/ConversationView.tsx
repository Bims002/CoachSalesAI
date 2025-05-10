import React, { useEffect, useRef } from 'react';
import type { Message } from '../App'; // Importer le type Message

interface ConversationViewProps {
  messages: Message[];
  interimTranscript: string;
}

const ConversationView: React.FC<ConversationViewProps> = ({ messages, interimTranscript }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Pour scroller automatiquement vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    // messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); // Commenté temporairement
  }, [messages, interimTranscript]);

  return (
    <div className="conversation-view-container">
      <h3>Conversation :</h3>
      <div className="messages-list">
        {messages.length === 0 && !interimTranscript && (
          <p className="placeholder-text">(La conversation apparaîtra ici...)</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            <p><strong>{msg.sender === 'user' ? 'Vous' : 'Client IA'}:</strong> {msg.text}</p>
          </div>
        ))}
        {interimTranscript && (
          <div className="message user interim">
            <p><em>{interimTranscript}...</em></p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ConversationView;
