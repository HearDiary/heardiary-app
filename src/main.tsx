import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import logo from './assets/logo_icon_256.png';

const App = () => {
  const [recordings, setRecordings] = useState([]);
  const [recordingName, setRecordingName] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const intervalRef = useRef(null);

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
        clearInterval(intervalRef.current);
        setRecordingTime(0);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordings((prev) => [
          ...prev,
          { name: recordingName || 'Untitled', url: audioUrl }
        ]);
        setRecordingName('');
      };

      mediaRecorder.start();
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
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

  const deleteRecording = (index) => {
    setRecordings((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ fontFamily: 'Arial', padding: '1rem' }}>
      <img src={logo} alt="HearDiary Logo" style={{ width: '64px', marginBottom: '1rem' }} />
      <h1>HearDiary</h1>
      <input
        type="text"
        placeholder="Enter recording name..."
        value={recordingName}
        onChange={(e) => setRecordingName(e.target.value)}
        style={{ padding: '0.5rem', marginRight: '0.5rem' }}
      />
      <button onClick={startRecording} style={{ padding: '0.5rem 1rem', backgroundColor: '#4CAF50', color: '#fff', border: 'none', marginRight: '0.5rem', borderRadius: '8px' }}>
        🎤 Start Recording
      </button>
      <button onClick={stopRecording} style={{ padding: '0.5rem 1rem', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '8px' }}>
        🔴 Stop Recording
      </button>
      <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#888' }}>
        {recordingTime > 0 && `Recording: ${recordingTime}s`}
      </div>

      <h2 style={{ marginTop: '2rem' }}>Recordings</h2>
      <ul style={{ paddingLeft: '1.2rem' }}>
        {recordings.map((rec, index) => (
          <li key={index} style={{ marginBottom: '1rem' }}>
            <strong>{rec.name}</strong> –
            <audio controls src={rec.url} style={{ display: 'block', marginTop: '0.5rem' }} />
            <button onClick={() => deleteRecording(index)} style={{ marginTop: '0.3rem', background: '#ddd', border: 'none', padding: '0.3rem 0.5rem', borderRadius: '6px' }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
