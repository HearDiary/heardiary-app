import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import logo from './assets/logo_icon_256.png';

interface Recording {
  name: string;
  dataUrl: string;
  time: string;
  note?: string;
  date: string;
  aiScore?: number;
  emotion?: string;
  tag?: string;
}

const App = () => {
  const [section, setSection] = useState<'record' | 'diary' | 'soundprint'>('record');
  const [recordings, setRecordings] = useState<Recording[]>(() => {
    const stored = localStorage.getItem('hearDiaryBase64Recordings');
    return stored ? JSON.parse(stored) : [];
  });
  const [recordingName, setRecordingName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [pinVerified, setPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playlistRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingSoundprint, setIsPlayingSoundprint] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    localStorage.setItem('hearDiaryBase64Recordings', JSON.stringify(recordings));
  }, [recordings]);

  useEffect(() => {
    document.body.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const getTimestamp = () => new Date().toLocaleString();
  const getDateString = () => new Date().toISOString().split('T')[0];

  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const fetchTagsFromAI = async (base64Audio: string): Promise<string> => {
    try {
      const response = await fetch('https://heardiary-ai-backend.onrender.com/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio })
      });
      const result = await response.json();
      return result.tag || 'unknown';
    } catch {
      return 'unknown';
    }
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
      intervalRef.current = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);

      mediaRecorder.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());

        const duration = formatTime(elapsedTime);
        setElapsedTime(0);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const dataUrl = await blobToBase64(audioBlob);
        const tag = await fetchTagsFromAI(dataUrl);
        const name = recordingName.trim() || `Recording ${getTimestamp()}`;
        const date = getDateString();
        const aiScore = Math.random();

        setRecordings((prev) => [...prev, { name, dataUrl, time: duration, note: '', date, aiScore, tag }]);
        setRecordingName('');
        setIsRecording(false);
      };
      mediaRecorder.start();
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
  };

  const stopSoundprint = () => {
    if (playlistRef.current) {
      playlistRef.current.pause();
      playlistRef.current = null;
    }
    setIsPlayingSoundprint(false);
  };

  const playSoundprint = () => {
    const filtered = recordings.filter((r) => r.date === selectedDate);
    if (!filtered.length) return;
    let current = 0;
    const audio = new Audio(filtered[current].dataUrl);
    playlistRef.current = audio;
    setIsPlayingSoundprint(true);
    audio.onended = () => {
      current++;
      if (current < filtered.length) {
        const next = new Audio(filtered[current].dataUrl);
        playlistRef.current = next;
        next.onended = audio.onended;
        next.play();
      } else {
        setIsPlayingSoundprint(false);
      }
    };
    audio.play();
  };

  const grouped = recordings.reduce((acc, r) => {
    acc[r.date] = acc[r.date] || [];
    acc[r.date].push(r);
    return acc;
  }, {} as Record<string, Recording[]>);

  const getTagIcon = (tag?: string) => {
    switch (tag) {
      case 'speech': return '🗣';
      case 'music': return '🎶';
      case 'noise': return '🌫';
      case 'dog': return '🐶';
      case 'water': return '💧';
      case 'silence': return '🤫';
      default: return '❓';
    }
  };

  if (!pinVerified) {
    return (
      <div className="centered">
        <h2>Enter your PIN</h2>
        <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} />
        <button onClick={() => pinInput === '1234' && setPinVerified(true)}>Submit</button>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <img src={logo} alt="logo" className="logo" />
        <h1>HearDiary</h1>
        <label className="switch">
          <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
          <span className="slider round"></span>
        </label>
      </header>

      {section === 'record' && (
        <section>
          <input value={recordingName} onChange={e => setRecordingName(e.target.value)} placeholder="Recording name..." />
          <button onClick={startRecording} disabled={isRecording}>Start</button>
          <button onClick={stopRecording} disabled={!isRecording}>Stop</button>
          {isRecording && <div>⏱ {formatTime(elapsedTime)}</div>}
        </section>
      )}

      {section === 'diary' && (
        <section>
          {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => (
            <div key={date}>
              <h3>{date}</h3>
              {grouped[date].map((r, i) => (
                <div key={i} className="recording-card">
                  <strong>{getTagIcon(r.tag)} {r.name}</strong> ({r.time}) – {r.emotion ?? '...'} – Score: {r.aiScore?.toFixed(2)}<br />
                  <audio controls src={r.dataUrl} />
                  <div>
                    <a href={r.dataUrl} download={`${r.name}.wav`}>Download</a>
                    <button onClick={() => setRecordings(prev => prev.filter(rec => rec !== r))}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {section === 'soundprint' && (
        <section>
          <h2>Soundprint</h2>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          {isPlayingSoundprint ? (
            <button onClick={stopSoundprint}>⏹ Stop</button>
          ) : (
            <button onClick={playSoundprint}>▶️ Play My Day</button>
          )}
        </section>
      )}

      <footer>
        <button onClick={() => { stopSoundprint(); setSection('record'); }}>🎙</button>
        <button onClick={() => { stopSoundprint(); setSection('diary'); }}>📁</button>
        <button onClick={() => setSection('soundprint')}>🎧</button>
      </footer>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
