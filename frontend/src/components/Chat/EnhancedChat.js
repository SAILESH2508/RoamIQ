import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ModelSelector from '../AI/ModelSelector';
import VoiceChat from '../AI/VoiceChat';
import ImageAnalyzer from '../AI/ImageAnalyzer';

const EnhancedChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const [conversationId, setConversationId] = useState('');
  const [useRAG, setUseRAG] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [showImageAnalyzer, setShowImageAnalyzer] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    // Generate conversation ID
    const userId = localStorage.getItem('userId') || 'anonymous';
    setConversationId(`user_${userId}_${Date.now()}`);

    // Add welcome message
    setMessages([{
      id: 1,
      type: 'assistant',
      content: 'Hello! I\'m your AI-powered travel companion. I can help you plan trips, analyze travel images, process voice messages, and much more. How can I assist you today?',
      timestamp: new Date(),
      model: 'system'
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const eventSource = eventSourceRef.current;
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (messageText = inputMessage, options = {}) => {
    if (!messageText.trim() && !options.isVoice) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageText,
      timestamp: new Date(),
      isVoice: options.isVoice || false
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');

      if (streamingEnabled && !useRAG) {
        await handleStreamingResponse(messageText, token);
      } else {
        await handleRegularResponse(messageText, token);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addErrorMessage('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStreamingResponse = async (messageText, token) => {
    setIsStreaming(true);

    const assistantMessage = {
      id: Date.now() + 1,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      model: selectedModel,
      isStreaming: true
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: messageText,
          model: selectedModel,
          conversation_id: conversationId,
          stream: true,
          use_rag: useRAG
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get streaming response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.chunk && !data.done) {
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessage.id
                    ? { ...msg, content: msg.content + data.chunk }
                    : msg
                ));
              }

              if (data.done) {
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessage.id
                    ? { ...msg, isStreaming: false }
                    : msg
                ));
                return;
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessage.id
          ? {
            ...msg,
            content: 'Sorry, I encountered an error while streaming the response.',
            isStreaming: false,
            error: true
          }
          : msg
      ));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleRegularResponse = async (messageText, token) => {
    const response = await axios.post('/api/ai/chat', {
      message: messageText,
      model: selectedModel,
      conversation_id: conversationId,
      stream: false,
      use_rag: useRAG
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const assistantMessage = {
      id: Date.now() + 1,
      type: 'assistant',
      content: response.data.response,
      timestamp: new Date(),
      model: response.data.model_used,
      ragEnabled: response.data.rag_enabled,
      sources: response.data.sources || []
    };

    setMessages(prev => [...prev, assistantMessage]);
  };

  const addErrorMessage = (errorText) => {
    const errorMessage = {
      id: Date.now() + 1,
      type: 'assistant',
      content: errorText,
      timestamp: new Date(),
      error: true
    };
    setMessages(prev => [...prev, errorMessage]);
  };

  const handleVoiceTranscription = (transcription) => {
    sendMessage(transcription, { isVoice: true });
  };

  const handleAudioResponse = (audioData, responseText) => {
    // Play audio response
    const audio = new Audio(audioData);
    audio.play().catch(console.error);
  };

  const handleImageAnalysis = (analysis) => {
    if (analysis.recommendations) {
      const imageMessage = {
        id: Date.now(),
        type: 'assistant',
        content: `I analyzed your image: "${analysis.caption}"\n\n${analysis.recommendations}`,
        timestamp: new Date(),
        model: 'image-analysis',
        imageAnalysis: analysis
      };
      setMessages(prev => [...prev, imageMessage]);
    }
  };

  const clearConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/ai/conversation/clear/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages([{
        id: 1,
        type: 'assistant',
        content: 'Conversation cleared. How can I help you?',
        timestamp: new Date(),
        model: 'system'
      }]);
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="enhanced-chat">
      <div className="card h-100">
        {/* Chat Header */}
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">
              <i className="fas fa-robot me-2"></i>
              AI Travel Assistant
            </h5>

            <div className="d-flex gap-2">
              <button
                className={`btn btn-sm ${showVoiceChat ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => setShowVoiceChat(!showVoiceChat)}
                title="Voice Chat"
              >
                <i className="fas fa-microphone"></i>
              </button>

              <button
                className={`btn btn-sm ${showImageAnalyzer ? 'btn-info' : 'btn-outline-info'}`}
                onClick={() => setShowImageAnalyzer(!showImageAnalyzer)}
                title="Image Analysis"
              >
                <i className="fas fa-camera"></i>
              </button>

              <button
                className="btn btn-sm btn-outline-danger"
                onClick={clearConversation}
                title="Clear Conversation"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </div>

          {/* AI Configuration */}
          <div className="mt-3">
            <div className="row g-2">
              <div className="col-md-6">
                <ModelSelector
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                />
              </div>

              <div className="col-md-6">
                <div className="d-flex gap-3 align-items-center h-100">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="useRAG"
                      checked={useRAG}
                      onChange={(e) => setUseRAG(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="useRAG">
                      <i className="fas fa-database me-1"></i>
                      RAG
                    </label>
                  </div>

                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="streaming"
                      checked={streamingEnabled}
                      onChange={(e) => setStreamingEnabled(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="streaming">
                      <i className="fas fa-stream me-1"></i>
                      Stream
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Body */}
        <div className="card-body d-flex flex-column" style={{ height: '500px' }}>
          {/* Voice Chat Panel */}
          {showVoiceChat && (
            <div className="mb-3 p-3 border rounded bg-light">
              <VoiceChat
                onTranscription={handleVoiceTranscription}
                onAudioResponse={handleAudioResponse}
              />
            </div>
          )}

          {/* Image Analyzer Panel */}
          {showImageAnalyzer && (
            <div className="mb-3">
              <ImageAnalyzer onAnalysis={handleImageAnalysis} />
            </div>
          )}

          {/* Messages */}
          <div className="flex-grow-1 overflow-auto mb-3" style={{ maxHeight: '400px' }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-3 d-flex ${message.type === 'user' ? 'justify-content-end' : 'justify-content-start'
                  }`}
              >
                <div
                  className={`message-bubble p-3 rounded-3 ${message.type === 'user'
                      ? 'bg-primary text-white'
                      : message.error
                        ? 'bg-danger text-white'
                        : 'bg-light'
                    }`}
                  style={{ maxWidth: '80%' }}
                >
                  {/* Message Content */}
                  <div className="message-content">
                    {message.content}
                    {message.isStreaming && (
                      <span className="streaming-cursor">▊</span>
                    )}
                  </div>

                  {/* Message Metadata */}
                  <div className="message-meta mt-2">
                    <small className={message.type === 'user' ? 'text-light' : 'text-muted'}>
                      {message.isVoice && <i className="fas fa-microphone me-1"></i>}
                      {message.model && message.model !== 'system' && (
                        <span className="me-2">
                          <i className="fas fa-robot me-1"></i>
                          {message.model}
                        </span>
                      )}
                      {message.ragEnabled && (
                        <span className="me-2">
                          <i className="fas fa-database me-1"></i>
                          RAG
                        </span>
                      )}
                      {message.timestamp.toLocaleTimeString()}
                    </small>
                  </div>

                  {/* RAG Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2">
                      <small className="text-muted">
                        <i className="fas fa-link me-1"></i>
                        Sources: {message.sources.length}
                      </small>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && !isStreaming && (
              <div className="d-flex justify-content-start mb-3">
                <div className="bg-light p-3 rounded-3">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="input-group">
            <textarea
              className="form-control"
              placeholder="Type your message... (Shift+Enter for new line)"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              rows="2"
              disabled={isLoading}
            />
            <button
              className="btn btn-primary"
              onClick={() => sendMessage()}
              disabled={isLoading || !inputMessage.trim()}
            >
              {isLoading ? (
                <span className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">Loading...</span>
                </span>
              ) : (
                <i className="fas fa-paper-plane"></i>
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .message-bubble {
          animation: fadeInUp 0.3s ease;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .streaming-cursor {
          animation: blink 1s infinite;
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        .typing-indicator {
          display: flex;
          gap: 4px;
        }
        
        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #6c757d;
          animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default EnhancedChat;