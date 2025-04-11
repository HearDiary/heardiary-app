// main.tsx
import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  const [recordings, setRecordings] = useState<{ name: string; url: string }[]>([]);
  const [recordingName, setRecordingName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];
      setIsRecording(true);
      setError('');

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordings((prev) => [
          ...prev,
          { name: recordingName || `Recording ${prev.length + 1}`, url: audioUrl },
        ]);
        setRecordingName('');
        setIsRecording(false);
        streamRef.current?.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
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

  return (
    <div style={{ padding: '1rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>HearDiary MVP</h1>
      <input
        placeholder="Enter recording name..."
        value={recordingName}
        onChange={(e) => setRecordingName(e.target.value)}
        disabled={isRecording}
        style={{ padding: '0.5rem', marginBottom: '0.5rem', display: 'block', width: '100%', maxWidth: '300px' }}
      />
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={startRecording}
          disabled={isRecording}
          style={{ backgroundColor: isRecording ? '#ccc' : 'green', color: 'white', padding: '0.5rem 1rem', marginRight: '1rem' }}
        >
          {isRecording ? 'Recording...' : 'Start Recording'}
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          style={{ backgroundColor: !isRecording ? '#ccc' : 'red', color: 'white', padding: '0.5rem 1rem' }}
        >
          Stop Recording
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2>Recordings</h2>
      <ul>
        {recordings.map((rec, i) => (
          <li key={i} style={{ marginBottom: '1rem' }}>
            <strong>{rec.name}</strong><br />
            <audio controls src={rec.url} style={{ display: 'block', marginTop: '0.5rem' }} />
            <a href={rec.url} download={`${rec.name}.webm`} style={{ fontSize: '0.9rem' }}>Download</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

