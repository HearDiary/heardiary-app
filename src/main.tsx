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
      setIsRecording(true);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordings((prev) => [...prev, { name: recordingName || 'Untitled', url: audioUrl }]);
        setRecordingName('');
        setIsRecording(false);
      };

      mediaRecorder.start();
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

  const deleteRecording = (index: number) => {
    const newRecordings = [...recordings];
    newRecordings.splice(index, 1);
    setRecordings(newRecordings);
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <img src={logo} alt="Logo" width={40} height={40} />
        <h1 style={{ fontSize: '1.8rem', margin: 0 }}>HearDiary</h1>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Enter recording name..."
          value={recordingName}
          onChange={(e) => setRecordingName(e.target.value)}
          style={{ padding: '0.5rem', width: 'calc(100% - 110px)', marginRight: '0.5rem', borderRadius: '8px', border: '1px solid #ccc' }}
        />
        <button
          onClick={startRecording}
          disabled={isRecording}
          style={{
            backgroundColor: isRecording ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            marginRight: '0.5rem',
            cursor: isRecording ? 'not-allowed' : 'pointer'
          }}
        >
          Start Recording
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          style={{
            backgroundColor: !isRecording ? '#ccc' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            cursor: !isRecording ? 'not-allowed' : 'pointer'
          }}
        >
          Stop Recording
        </button>
      </div>
      <h2>Recordings</h2>
      <ul style={{ padding: 0, listStyle: 'none' }}>
        {recordings.map((rec, index) => (
          <li key={index} style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column' }}>
            <strong>{rec.name}</strong>
            <audio controls src={rec.url} style={{ marginTop: '0.25rem', borderRadius: '8px', width: '100%' }} />
            <button
              onClick={() => deleteRecording(index)}
              style={{
                backgroundColor: '#888',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.25rem 0.5rem',
                marginTop: '0.5rem',
                width: 'fit-content',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
