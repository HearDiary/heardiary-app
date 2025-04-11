// main.tsx
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import logo from './assets/logo_icon_256.png';

const App = () => {
  const [recordings, setRecordings] = useState<{ name: string; url: string; time: string }[]>([]);
  const [recordingName, setRecordingName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setElapsedTime(0);
      setIsRecording(true);

      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        const duration = formatTime(elapsedTime);
        setElapsedTime(0);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordings(prev => [
          ...prev,
          { name: recordingName || 'Untitled', url: audioUrl, time: duration }
        ]);
        setRecordingName('');
        setIsRecording(false);
      };

      mediaRecorder.start();
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const deleteRecording = (index: number) => {
    setRecordings(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ fontFamily: 'Arial', textAlign: 'center', background: 'linear-gradient(to bottom, #f0f4f8, #d9e2ec)', minHeight: '100vh', padding: '2rem' }}>
      <img src={logo} alt="Logo" style={{ width: 64, marginBottom: '1rem' }} />
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>HearDiary</h1>
      <input
        placeholder="Enter recording name..."
        value={recordingName}
        onChange={e => setRecordingName(e.target.value)}
        style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid #ccc', marginBottom: '1rem', width: '80%', maxWidth: '300px' }}
      />
      <div style={{ margin: '1rem' }}>
        <button
          onClick={startRecording}
          disabled={isRecording}
          style={{
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            padding: '0.6rem 1rem',
            borderRadius: '12px',
            marginRight: '1rem',
            cursor: 'pointer'
          }}>
          Start Recording
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          style={{
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            padding: '0.6rem 1rem',
            borderRadius: '12px',
            cursor: 'pointer'
          }}>
          Stop Recording
        </button>
      </div>
      {isRecording && (
        <div style={{ marginBottom: '1rem', fontSize: '1.1rem', color: '#333' }}>
          Recording time: {formatTime(elapsedTime)}
        </div>
      )}
      <h2 style={{ marginTop: '2rem' }}>Recordings</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {recordings.map((rec, index) => (
          <li key={index} style={{ marginBottom: '1rem' }}>
            <strong>{rec.name}</strong> ({rec.time})<br />
            <audio controls src={rec.url} style={{ borderRadius: '10px', marginTop: '0.5rem' }} />
            <br />
            <button
              onClick={() => deleteRecording(index)}
              style={{ marginTop: '0.5rem', backgroundColor: '#999', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
