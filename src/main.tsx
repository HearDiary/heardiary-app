// main.tsx – verzia s kolekciami, triedením podľa dátumu a denným "soundprintom"
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import logo from './assets/logo_icon_256.png';

interface Recording {
  name: string;
  dataUrl: string;
  time: string;
  note?: string;
  date: string;
}

const App = () => {
  const [recordings, setRecordings] = useState<Recording[]>(() => {
    const stored = localStorage.getItem('hearDiaryBase64Recordings');
    return stored ? JSON.parse(stored) : [];
  });
  const [recordingName, setRecordingName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playlistRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingSoundprint, setIsPlayingSoundprint] = useState(false);

  useEffect(() => {
    localStorage.setItem('hearDiaryBase64Recordings', JSON.stringify(recordings));
  }, [recordings]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const getTimestamp = () => {
    const now = new Date();
    return now.toLocaleString();
  };

  const getDateString = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setElapsedTime(0);
      setIsRecording(true);

      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const duration = formatTime(elapsedTime);
        setElapsedTime(0);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const dataUrl = await blobToBase64(audioBlob);
        const name = recordingName.trim() || `Recording ${getTimestamp()}`;
        const date = getDateString();
        setRecordings((prev) => [...prev, { name, dataUrl, time: duration, note: '', date }]);
        setRecordingName('');
        setIsRecording(false);
      };

      mediaRecorder.start();
    } catch (error) {
      console.error('Error accessing microphone:', error);
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

  const updateNote = (index: number, note: string) => {
    setRecordings((prev) => {
      const updated = [...prev];
      updated[index].note = note;
      return updated;
    });
  };

  const toggleTheme = () => setDarkMode((prev) => !prev);

  const groupByDate = (recs: Recording[]) => {
    const groups: Record<string, Recording[]> = {};
    for (const r of recs) {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    }
    return groups;
  };

  const playSoundprint = (date: string) => {
    const todays = recordings.filter((r) => r.date === date);
    if (todays.length === 0) return;

    let current = 0;
    const audio = new Audio(todays[current].dataUrl);
    playlistRef.current = audio;
    setIsPlayingSoundprint(true);

    audio.onended = () => {
      current++;
      if (current < todays.length) {
        const next = new Audio(todays[current].dataUrl);
        playlistRef.current = next;
        next.onended = audio.onended;
        next.play();
      } else {
        setIsPlayingSoundprint(false);
      }
    };
    audio.play();
  };

  const grouped = groupByDate(recordings);
  const sortedDates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div style={{ fontFamily: 'Arial', textAlign: 'center', background: darkMode ? 'linear-gradient(to bottom, #1e1e1e, #2c2c2c)' : 'linear-gradient(to bottom, #f0f4f8, #d9e2ec)', color: darkMode ? '#eee' : '#000', minHeight: '100vh', padding: '2rem' }}>
      <button onClick={toggleTheme} style={{ position: 'absolute', top: 16, right: 16 }}>
        {darkMode ? '☀️ Light' : '🌙 Dark'}
      </button>
      <img src={logo} alt="Logo" style={{ width: 64, marginBottom: '1rem' }} />
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>HearDiary</h1>
      <input
        placeholder="Enter recording name..."
        value={recordingName}
        onChange={(e) => setRecordingName(e.target.value)}
        style={{ padding: '0.5rem', borderRadius: '10px', border: '1px solid #ccc', marginBottom: '1rem', width: '80%', maxWidth: '300px' }}
      />
      <div style={{ margin: '1rem' }}>
        <button onClick={startRecording} disabled={isRecording} style={{ backgroundColor: '#4caf50', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '12px', marginRight: '1rem', cursor: 'pointer' }}>Start Recording</button>
        <button onClick={stopRecording} disabled={!isRecording} style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '12px', cursor: 'pointer' }}>Stop Recording</button>
      </div>
      {isRecording && <div style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Recording time: {formatTime(elapsedTime)}</div>}

      <h2 style={{ marginTop: '2rem' }}>Your Soundprints</h2>
      {sortedDates.map((date) => (
        <div key={date} style={{ marginBottom: '2rem' }}>
          <h3>{date}</h3>
          <button
            onClick={() => playSoundprint(date)}
            disabled={isPlayingSoundprint}
            style={{ marginBottom: '1rem', backgroundColor: '#6200ea', color: 'white', padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            ▶️ Play My Day
          </button>
          {grouped[date].map((rec, index) => (
            <div key={index} style={{ marginBottom: '2rem' }}>
              <strong>{rec.name}</strong> ({rec.time})<br />
              <audio controls src={rec.dataUrl} style={{ borderRadius: '10px', marginTop: '0.5rem' }} /><br />
              <textarea
                placeholder="Add a note..."
                value={rec.note || ''}
                onChange={(e) => updateNote(recordings.indexOf(rec), e.target.value)}
                style={{ width: '80%', maxWidth: '400px', marginTop: '0.5rem', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc' }}
              />
              <div style={{ marginTop: '0.5rem' }}>
                <a
                  href={rec.dataUrl}
                  download={rec.name + '.wav'}
                  style={{ marginRight: '1rem', backgroundColor: '#2196f3', color: '#fff', padding: '0.3rem 0.6rem', borderRadius: '6px', textDecoration: 'none' }}>
                  Download
                </a>
                <button
                  onClick={() => deleteRecording(recordings.indexOf(rec))}
                  style={{ backgroundColor: '#999', color: '#fff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
