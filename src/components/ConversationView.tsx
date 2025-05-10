import React, { useEffect, useRef } from 'react';
import type { Message } from '../App'; // Importer le type Message

interface ConversationViewProps {
  messages: Message[];
  interimTranscript: string;
  onPlayAiAudio: (audioContent: string) => void;
  isMobile: boolean;
}

const ConversationView: React.FC<ConversationViewProps> = ({ messages, interimTranscript, onPlayAiAudio, isMobile }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Pour scroller automatiquement vers le bas quand de nouveaux messages arrivent
  // Réactivé car la navigation par étape rend cela moins problématique
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimTranscript]);

  return (
    <div className="conversation-view-container">
      {/* Le titre H3 est maintenant dans App.tsx pour cette section */}
      <div className="messages-list">
        {messages.length === 0 && !interimTranscript && (
          <p className="placeholder-text">(La conversation apparaîtra ici...)</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            <p><strong>{msg.sender === 'user' ? 'Vous' : 'Client IA'}:</strong> {msg.text}</p>
            {isMobile && msg.sender === 'ai' && msg.audioContent && (
              <button 
                onClick={() => onPlayAiAudio(msg.audioContent!)} 
                className="play-audio-button"
                title="Écouter la réponse de l'IA"
              >
                ▶️ Écouter
              </button>
            )}
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
