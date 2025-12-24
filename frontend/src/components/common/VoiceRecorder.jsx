import { useState, useRef, useEffect } from 'react';
import { useDialog } from '../../context/DialogContext';
import './VoiceRecorder.css';

const VoiceRecorder = ({ onRecordingComplete, onCancel }) => {
  const { showAlert } = useDialog();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      await showAlert('Could not access microphone. Please check permissions.', 'Error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleSubmit = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    onCancel();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-recorder">
      <div className="voice-recorder-header">
        <h3>Voice Recording</h3>
        <button className="close-btn" onClick={handleCancel}>×</button>
      </div>
      <div className="voice-recorder-body">
        {!isRecording && !audioUrl && (
          <div className="recording-controls">
            <button className="btn btn-primary" onClick={startRecording}>
              Start Recording
            </button>
          </div>
        )}

        {isRecording && (
          <div className="recording-status">
            <div className="recording-indicator">
              <span className="recording-dot"></span>
              <span>Recording...</span>
            </div>
            <div className="recording-time">{formatTime(recordingTime)}</div>
            <button className="btn btn-danger" onClick={stopRecording}>
              Stop Recording
            </button>
          </div>
        )}

        {audioUrl && !isRecording && (
          <div className="audio-preview">
            <audio controls src={audioUrl}></audio>
            <div className="audio-actions">
              <button className="btn btn-secondary" onClick={handleCancel}>
                Record Again
              </button>
              <button className="btn btn-success" onClick={handleSubmit}>
                Use This Recording
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;

