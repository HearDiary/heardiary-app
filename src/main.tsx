// main.tsx
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import logo from './assets/logo_icon_256.png'; // Pridaj svoj správny názov loga z balíka

const App = () => {
  const [recordings, setRecordings] = useState<{ name: string; url: string }[]>([]);
  const [recordingName, setRecordingName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const preferredMimeType = isSafari ? 'audio/mp4' : 'audio/webm;codecs=opus';

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: preferredMimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setIsRecording(true);
      setError('');
      setRecordingTime(0);

      intervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: preferredMimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordings((prev) => [
          ...prev,
          { name: recordingName || `Recording ${prev.length + 1}`, url: audioUrl },
        ]);
        setRecordingName('');
        setIsRecording(false);
        setRecordingTime(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
        streamRef.current?.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
    } catch (err) {
      setError('Microphone access denied or not supported.');
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const deleteRecording = (index: number) => {
    setRecordings((prev) => prev.filter((_, i) => i !== index));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'Arial, sans-serif', background: 'linear-gradient(to right, #f0f4f8, #d9e2ec)', minHeight: '100vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        <img src={logo} alt="HearDiary Logo" style={{ height: '48px', marginRight: '1rem' }} />
        <h1 style={{ color: '#333', fontSize: '2rem' }}>HearDiary</h1>
      </header>

      <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', maxWidth: '400px', marginBottom: '2rem' }}>
        <input
          placeholder="Enter recording name..."
          value={recordingName}
          onChange={(e) => setRecordingName(e.target.value)}
          disabled={isRecording}
          style={{ padding: '0.5rem', width: '100%', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #ccc' }}
        />

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={startRecording}
            disabled={isRecording}
            style={{ backgroundColor: '#4CAF50', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '8px' }}
          >
            {isRecording ? 'Recording...' : 'Start'}
          </button>
          <button
            onClick={stopRecording}
            disabled={!isRecording}
            style={{ backgroundColor: '#f44336', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '8px' }}
          >
            Stop
          </button>
          {isRecording && <span style={{ color: '#e53935', fontWeight: 'bold' }}>{formatTime(recordingTime)}</span>}
        </div>
        {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}
      </div>

      <h2 style={{ color: '#333' }}>Recordings</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {recordings.map((rec, i) => (
          <div key={i} style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
            <strong>{rec.name}</strong>
            <audio controls src={rec.url} style={{ display: 'block', marginTop: '0.5rem', width: '100%' }} />
            <div style={{ marginTop: '0.5rem' }}>
              <a href={rec.url} download={`${rec.name}.${isSafari ? 'mp4' : 'webm'}`} style={{ marginRight: '1rem', color: '#1976d2' }}>Download</a>
              <button onClick={() => deleteRecording(i)} style={{ background: 'none', color: '#f44336', border: 'none', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
