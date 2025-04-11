// src/main.tsx

import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  const [recordings, setRecordings] = useState<{ name: string; url: string }[]>([]);
  const [recordingName, setRecordingName] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordings((prev) => [
          ...prev,
          { name: recordingName || 'Untitled', url: audioUrl },
        ]);
        setRecordingName('');
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

  return (
    <div style={{ padding: '1rem', fontFamily: 'Arial' }}>
      <h1>HearDiary MVP</h1>
      <input
        type="text"
        placeholder="Enter recording name..."
        value={recordingName}
        onChange={(e) => setRecordingName(e.target.value)}
      />
      <br />
      <button onClick={startRecording} style={{ marginTop: '10px', marginRight: '10px' }}>
        Start Recording
      </button>
      <button onClick={stopRecording} style={{ marginTop: '10px' }}>
        Stop Recording
      </button>

      <h2>Recordings</h2>
      <ul>
        {recordings.map((rec, index) => (
          <li key={index}>
            <strong>{rec.name}</strong> – <audio controls src={rec.url}></audio>
          </li>
        ))}
      </ul>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
