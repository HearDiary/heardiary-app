import React, { useState, useRef } from 'react';
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
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      setIsRecording(true);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordings(prev => [...prev, { name: recordingName || 'Untitled', url: audioUrl }]);
        setRecordingName('');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
    } catch (error) {
      alert('Please allow microphone access.');
      console.error('Microphone access denied or error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'Arial' }}>
      <h1>HearDiary MVP</h1>
      <input
        placeholder="Enter recording name..."
        value={recordingName}
        onChange={e => setRecordingName(e.target.value)}
        disabled={isRecording}
        style={{ padding: '0.5rem', marginRight: '1rem' }}
      />
      <button
        onClick={startRecording}
        disabled={isRecording}
        style={{ backgroundColor: 'green', color: 'white', padding: '0.5rem 1rem', marginRight: '1rem' }}
      >
        {isRecording ? 'Recording...' : 'Start Recording'}
      </button>
      <button
        onClick={stopRecording}
        disabled={!isRecording}
        style={{ backgroundColor: 'red', color: 'white', padding: '0.5rem 1rem' }}
      >
        Stop Recording
      </button>

      <h2 style={{ marginTop: '2rem' }}>Recordings</h2>
      <ul>
        {recordings.map((rec, i) => (
          <li key={i}>
            <strong>{rec.name}</strong>
            <audio controls src={rec.url} style={{ display: 'block', marginTop: '0.5rem' }} />
            <a href={rec.url} download={`${rec.name}.webm`} style={{ fontSize: '0.9rem' }}>Download</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

