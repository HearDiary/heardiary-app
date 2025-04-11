import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import logo from './assets/logo_icon_256.png';

const App = () => {
  const [recordings, setRecordings] = useState<{ name: string; url: string }[]>([]);
  const [recordingName, setRecordingName] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setIsRecording(true);
      setElapsedTime(0);

      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

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
        setIsRecording(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
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
    setRecordings((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 font-sans">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center mb-4">
          <img src={logo} alt="HearDiary Logo" className="h-10 w-10 mr-2" />
          <h1 className="text-3xl font-bold">HearDiary</h1>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            placeholder="Enter recording name..."
            value={recordingName}
            onChange={(e) => setRecordingName(e.target.value)}
            className="flex-1 p-2 rounded border border-gray-300"
          />
          <button
            onClick={startRecording}
            disabled={isRecording}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Start Recording
          </button>
          <button
            onClick={stopRecording}
            disabled={!isRecording}
            className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Stop Recording
          </button>
        </div>
        {isRecording && (
          <div className="mb-2 text-sm text-gray-600">Recording... {elapsedTime}s</div>
        )}
        <h2 className="text-xl font-semibold mt-4 mb-2">Recordings</h2>
        <ul className="space-y-2">
          {recordings.map((rec, index) => (
            <li key={index} className="bg-white p-3 rounded shadow flex items-center justify-between">
              <div>
                <strong>{rec.name}</strong>
                <audio controls src={rec.url} className="block mt-1" />
              </div>
              <button
                onClick={() => deleteRecording(index)}
                className="text-sm text-red-500 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
