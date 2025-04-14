// main.tsx (vylepšená verzia s PIN kódom, tmavým/svetlým režimom, vylepšeným dizajnom a zachovanou funkcionalitou)

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
  tag?: string;
}

const App = () => {
  const [section, setSection] = useState<'record' | 'diary' | 'soundprint'>('record');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recordingName, setRecordingName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('darkMode') === 'true');
  const [pinEntered, setPinEntered] = useState(false);
  const [pin, setPin] = useState('');
  const [storedPin, setStoredPin] = useState<string | null>(() => localStorage.getItem('heardiaryPIN'));
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playlistRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingSoundprint, setIsPlayingSoundprint] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('hearDiaryBase64Recordings');
    if (stored) setRecordings(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem('hearDiaryBase64Recordings', JSON.stringify(recordings));
  }, [recordings]);

  useEffect(() => {
    document.body.className = darkMode ? 'dark' : 'light';
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const getDateString = () => new Date().toISOString().split('T')[0];
  const getTimestamp = () => new Date().toLocaleString();

  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const fetchTagsFromAI = async (base64: string): Promise<string> => {
    try {
      const res = await fetch('https://heardiary-ai-backend.onrender.com/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64 })
      });
      const json = await res.json();
      return json.tag || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];
    setElapsedTime(0);
    setIsRecording(true);
    intervalRef.current = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    recorder.ondataavailable = (e) => e.data.size && audioChunksRef.current.push(e.data);
    recorder.onstop = async () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const dataUrl = await blobToBase64(blob);
      const tag = await fetchTagsFromAI(dataUrl);
      const aiScore = Math.random();
      const date = getDateString();
      const name = recordingName || `Recording ${getTimestamp()}`;
      setRecordings([...recordings, { name, dataUrl, date, time: formatTime(elapsedTime), aiScore, tag }]);
      setRecordingName('');
      setIsRecording(false);
    };
    recorder.start();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop();
  };

  const playSoundprint = () => {
    const todayAudios = recordings.filter((r) => r.date === selectedDate);
    if (!todayAudios.length) return;
    let i = 0;
    const audio = new Audio(todayAudios[i].dataUrl);
    playlistRef.current = audio;
    audio.onended = () => {
      i++;
      if (i < todayAudios.length) {
        const next = new Audio(todayAudios[i].dataUrl);
        playlistRef.current = next;
        next.onended = audio.onended;
        next.play();
      } else setIsPlayingSoundprint(false);
    };
    setIsPlayingSoundprint(true);
    audio.play();
  };

  const stopSoundprint = () => {
    playlistRef.current?.pause();
    playlistRef.current = null;
    setIsPlayingSoundprint(false);
  };

  const grouped = recordings.reduce((acc, r) => {
    (acc[r.date] ||= []).push(r);
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

  if (!pinEntered) {
    return (
      <div className="centered">
        <img src={logo} width={50} />
        <h2>Enter PIN</h2>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter your PIN"
        />
        <button onClick={() => {
          if (storedPin) {
            if (pin === storedPin) setPinEntered(true);
          } else {
            localStorage.setItem('heardiaryPIN', pin);
            setStoredPin(pin);
            setPinEntered(true);
          }
        }}>OK</button>
      </div>
    );
  }

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <header>
        <img src={logo} alt="logo" className="logo" />
        <div className="switch-container">
          <span>{darkMode ? '🌙' : '☀️'}</span>
          <label className="switch">
            <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
            <span className="slider" />
          </label>
        </div>
      </header>
      <h2>HearDiary</h2>

      {section === 'record' && (
        <div className="section">
          <input value={recordingName} onChange={(e) => setRecordingName(e.target.value)} placeholder="Recording name..." />
          <div className="buttons">
            <button onClick={startRecording} disabled={isRecording}>Start</button>
            <button onClick={stopRecording} disabled={!isRecording}>Stop</button>
          </div>
          {isRecording && <p>⏱ {formatTime(elapsedTime)}</p>}
        </div>
      )}

      {section === 'diary' && (
        <div className="section">
          {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map((date) => (
            <div key={date}>
              <h4>{date}</h4>
              {grouped[date].map((r, i) => (
                <div key={i} className="card">
                  <strong>{getTagIcon(r.tag)} {r.name}</strong> ({r.time}) – {r.tag} – Score: {r.aiScore?.toFixed(2)}<br />
                  <audio controls src={r.dataUrl} />
                  <div className="buttons">
                    <button onClick={() => {
                      const a = document.createElement('a');
                      a.href = r.dataUrl;
                      a.download = `${r.name}.wav`;
                      a.click();
                    }}>⬇️ Download</button>
                    <button onClick={() => {
                      setRecordings((prev) => prev.filter((_, j) => !(r.date === date && j === i)));
                    }}>🗑 Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {section === 'soundprint' && (
        <div className="section">
          <h3>Soundprint</h3>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          {isPlayingSoundprint ? (
            <button onClick={stopSoundprint}>⏹ Stop</button>
          ) : (
            <button onClick={playSoundprint}>▶️ Play My Day</button>
          )}
        </div>
      )}

      <nav>
        <button onClick={() => { stopSoundprint(); setSection('record'); }}>🎙</button>
        <button onClick={() => { stopSoundprint(); setSection('diary'); }}>📁</button>
        <button onClick={() => setSection('soundprint')}>🎧</button>
      </nav>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
