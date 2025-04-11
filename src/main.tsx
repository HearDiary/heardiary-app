// main.tsx
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  const [recordings, setRecordings] = useState<{ name: string; url: string }[]>([]);
  const [recordingName, setRecordingName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordings(prev => [
          ...prev,
          { name: recordingName || 'Untitled', url: audioUrl }
        ]);
        setRecordingName('');
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'Arial' }}>
      <h1>HearDiary MVP</h1>
      <input
        placeholder="Enter recording name..."
        value={recordingName}
        onChange={(e) => setRecordingName(e.target.value)}
        style={{ marginRight: '1rem', padding: '0.25rem' }}
      />
      <button onClick={startRecording} disabled={isRecording} style={{ marginRight: '0.5rem' }}>
        Start Recording
      </button>
      <button onClick={stopRecording} disabled={!isRecording}>
        Stop Recording
      </button>

      <h2 style={{ marginTop: '2rem' }}>Recordings</h2>
      <ul>
        {recordings.map((rec, index) => (
          <li key={index}>
            <strong>{rec.name}</strong> – <audio controls src={rec.url} />
          </li>
        ))}
      </ul>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
