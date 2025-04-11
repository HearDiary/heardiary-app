import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import logo from './assets/logo_icon_256.png';

const App = () => {
  const [recordings, setRecordings] = useState<{ name: string; url: string }[]>([]);
  const [recordingName, setRecordingName] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
        setRecordings((prev) => [...prev, { name: recordingName || 'Untitled', url: audioUrl }]);
        setRecordingName('');
        clearInterval(intervalRef.current!);
        setRecordingTime(0);
      };

      mediaRecorder.start();
      intervalRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const deleteRecording = (index: number) => {
    setRecordings((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center p-6">
      <img src={logo} alt="HearDiary Logo" className="w-16 h-16 mb-4" />
      <h1 className="text-3xl font-bold mb-4">HearDiary</h1>
      <div className="flex flex-col items-center mb-6">
        <input
          type="text"
          placeholder="Enter recording name..."
          className="border rounded p-2 mb-2 text-center"
          value={recordingName}
          onChange={(e) => setRecordingName(e.target.value)}
        />
        <div className="flex gap-4">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            onClick={startRecording}
          >
            Start Recording
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            onClick={stopRecording}
          >
            Stop Recording
          </button>
        </div>
        {recordingTime > 0 && (
          <div className="mt-2 text-sm text-gray-600">Recording time: {recordingTime}s</div>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-2">Recordings</h2>
      <ul className="w-full max-w-md space-y-3">
        {recordings.map((rec, index) => (
          <li key={index} className="bg-gray-100 rounded-xl p-4 flex items-center justify-between">
            <div className="flex-1">
              <strong>{rec.name}</strong>
              <audio controls className="w-full mt-1">
                <source src={rec.url} type="audio/wav" />
              </audio>
            </div>
            <button
              className="text-red-600 ml-4 hover:text-red-800"
              onClick={() => deleteRecording(index)}
            >
              ✖
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
