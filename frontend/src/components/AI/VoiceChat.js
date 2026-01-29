import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const VoiceChat = ({ onTranscription, onAudioResponse }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      // Set up audio level monitoring
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);

        if (isRecording) {
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();

      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm;codecs=opus'
        });

        stream.getTracks().forEach(track => track.stop());

        await processAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(null);

    } catch (err) {
      setError('Failed to access microphone. Please check permissions.');
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  const processAudio = async (audioBlob) => {
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('process_with_ai', 'true');

      const token = localStorage.getItem('token');
      const response = await axios.post('/api/ai/audio/transcribe', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const { text, ai_response } = response.data;

      if (text) {
        onTranscription && onTranscription(text);

        if (ai_response) {
          // Convert AI response to speech
          const ttsResponse = await axios.post('/api/ai/audio/synthesize', {
            text: ai_response,
            language: 'en'
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (ttsResponse.data.audio_data) {
            const audioData = `data:audio/mp3;base64,${ttsResponse.data.audio_data}`;
            onAudioResponse && onAudioResponse(audioData, ai_response);
          }
        }
      }

    } catch (err) {
      setError('Failed to process audio. Please try again.');
      console.error('Error processing audio:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const getAudioLevelColor = () => {
    // Return specific color codes: Orange shades
    if (audioLevel < 50) return '#fbbf24'; // Amber
    if (audioLevel < 100) return '#f97316'; // Orange
    if (audioLevel < 150) return '#ea580c'; // Deep Orange
    return '#c2410c'; // Burnt Orange
  };

  return (
    <div className="voice-chat-container">
      <div className="text-center">
        <button
          className={`btn btn-lg rounded-circle voice-btn ${isRecording ? 'btn-danger' : 'btn-primary'
            }`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          style={{
            width: '80px',
            height: '80px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {isProcessing ? (
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Processing...</span>
            </div>
          ) : (
            <i className={`fas ${isRecording ? 'fa-stop text-white' : 'fa-microphone text-white'} fa-2x`}></i>
          )}

          {isRecording && (
            <div
              className="position-absolute bottom-0 start-0"
              style={{
                width: '100%',
                height: `${(audioLevel / 255) * 100}%`,
                opacity: 0.5,
                transition: 'height 0.1s ease',
                backgroundColor: getAudioLevelColor()
              }}
            ></div>
          )}
        </button>

        <div className="mt-3">
          {isRecording && (
            <div className="text-danger">
              <i className="fas fa-circle me-2 blink"></i>
              Recording... Click to stop
            </div>
          )}

          {isProcessing && (
            <div className="text-info">
              <i className="fas fa-cog fa-spin me-2"></i>
              Processing audio...
            </div>
          )}

          {!isRecording && !isProcessing && (
            <div className="text-muted">
              <i className="fas fa-microphone me-2"></i>
              Click to start voice chat
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-danger mt-3" role="alert">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}
      </div>

      <style jsx>{`
        .voice-btn {
          background: linear-gradient(135deg, #f97316, #fbbf24); /* Orange to Amber */
          border: 4px solid #ffffff;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .voice-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(249, 115, 22, 0.3);
        }

        .voice-btn.btn-danger {
            background: linear-gradient(135deg, #f97316, #fbbf24); /* Orange to Amber */
            border-color: #ffffff;
        }

        .text-info { color: #f97316 !important; } /* Orange */
        .text-success { color: #10b981 !important; } /* Green */
        .text-warning { color: #fbbf24 !important; } /* Amber */
        .text-brown { color: #78350f !important; } /* Brown */
        
        .blink {
          animation: blink 1s infinite;
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default VoiceChat;