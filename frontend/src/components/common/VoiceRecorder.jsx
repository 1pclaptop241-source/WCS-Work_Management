import { useState, useRef, useEffect } from 'react';
import { useDialog } from '../../context/DialogContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Mic, Square, RotateCcw, Check, User } from "lucide-react";

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

  const handleCancelClick = () => {
    if (isRecording) {
      stopRecording();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    if (onCancel) onCancel();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full border-0 shadow-none bg-transparent">
      {!isRecording && !audioUrl && (
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Mic className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-lg">Record Voice Note</h3>
            <p className="text-sm text-muted-foreground">Click below to start recording</p>
          </div>
          <Button onClick={startRecording} size="lg" className="rounded-full px-8">
            Start Recording
          </Button>
        </div>
      )}

      {isRecording && (
        <div className="flex flex-col items-center justify-center p-6 space-y-6">
          <div className="relative">
            <span className="absolute -inset-4 rounded-full bg-red-100 animate-pulse opacity-70"></span>
            <div className="bg-red-500 text-white rounded-full p-4 relative z-10">
              <Mic className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{formatTime(recordingTime)}</div>
            <p className="text-sm text-red-500 font-medium animate-pulse">Recording...</p>
          </div>
          <Button variant="destructive" onClick={stopRecording} size="lg" className="rounded-full px-8">
            <Square className="mr-2 h-4 w-4 fill-current" /> Stop Recording
          </Button>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="flex flex-col p-4 gap-4">
          <div className="w-full bg-muted/30 p-4 rounded-lg border flex flex-col items-center gap-3">
            <audio controls src={audioUrl} className="w-full h-10" />
            <div className="text-xs text-muted-foreground">
              Recorded duration: {formatTime(recordingTime)}
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleCancelClick} className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" /> Redo
            </Button>
            <Button onClick={handleSubmit} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              <Check className="mr-2 h-4 w-4" /> Use Recording
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default VoiceRecorder;

