
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordings, setRecordings] = useState<{ url: string; name: string }[]>([]);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [name, setName] = useState("");

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => setChunks(prev => [...prev, e.data]);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setRecordings(prev => [...prev, { url, name }]);
      setChunks([]);
    };
    recorder.start();
    setMediaRecorder(recorder);
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <h1>HearDiary MVP</h1>
      <input 
        type="text" 
        placeholder="Enter recording name..." 
        value={name} 
        onChange={e => setName(e.target.value)} 
      />
      <br /><br />
      <button onClick={startRecording}>Start Recording</button>
      <button onClick={stopRecording}>Stop Recording</button>
      <h2>Recordings</h2>
      <ul>
        {recordings.map((rec, index) => (
          <li key={index}>
            <strong>{rec.name || "Unnamed"}</strong>
            <audio controls src={rec.url}></audio>
          </li>
        ))}
      </ul>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('app')!).render(<App />);
