// main.tsx
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import logo from './assets/logo_icon_256.png';

const App = () => {
  const [recordings, setRecordings] = useState<{ name: string; url: string }[]>([]);
  const [recordingName, setRecordingName] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordings(prev => [...prev, { name: recordingName || 'Untitled', url: audioUrl }]);
        setRecordingName('');
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Please allow microphone access to record audio.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <img src={logo} alt="HearDiary Logo" style={{ width: '48px', height: '48px', marginRight: '1rem' }} />
        <h1>HearDiary</h1>
      </div>

      <input
        type="text"
        placeholder="Enter recording name..."
        value={recordingName}
        onChange={e => setRecordingName(e.target.value)}
        style={{ padding: '0.5rem', fontSize: '1rem', marginRight: '1rem', borderRadius: '0.5rem' }}
      />
      <button
        onClick={startRecording}
        disabled={isRecording}
        style={{ padding: '0.5rem 1rem', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '0.5rem', marginRight: '0.5rem' }}
      >
        Start Recording
      </button>
      <button
        onClick={stopRecording}
        disabled={!isRecording}
        style={{ padding: '0.5rem 1rem', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '0.5rem' }}
      >
        Stop Recording
      </button>

      <h2 style={{ marginTop: '2rem' }}>Recordings</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {recordings.map((rec, index) => (
          <li key={index} style={{ marginBottom: '1rem' }}>
            <strong>{rec.name}</strong>
            <audio controls src={rec.url} style={{ display: 'block', marginTop: '0.5rem' }} />
          </li>
        ))}
      </ul>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
