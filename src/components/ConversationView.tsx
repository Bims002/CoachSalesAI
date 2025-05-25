import React, { useEffect, useRef } from 'react';
import type { Message } from '../App';

interface ConversationViewProps {
  messages: Message[];
  interimTranscript: string;
  onPlayAiAudio: (audioContent: string) => void;
  isMobile: boolean;
}

const ConversationView: React.FC<ConversationViewProps> = ({ messages, interimTranscript, onPlayAiAudio, isMobile }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimTranscript]);

  return (
    <div className="conversation-view-container">
      <div className="messages-list">
        {messages.length === 0 && !interimTranscript && (
          <p className="placeholder-text">(La conversation apparaîtra ici...)</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            <p>
              <strong>{msg.sender === 'user' ? 'Vous' : 'Client IA'}:</strong> {msg.text}
              {/* Afficher le bouton de lecture audio uniquement sur mobile ET si audioContent existe */}
              {isMobile && msg.sender === 'ai' && msg.audioContent && (
                <button
                  className="play-audio-button"
                  onClick={() => onPlayAiAudio(msg.audioContent!)}
                  title="Écouter la réponse de l'IA"
                  style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                  🔊
                </button>
              )}
            </p>
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
