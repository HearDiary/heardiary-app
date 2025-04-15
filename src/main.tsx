import React, { useState, useRef, useEffect } from 'react';
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
  const [pin, setPin] = useState('');
  const [storedPin, setStoredPin] = useState<string | null>(localStorage.getItem('heardiaryPin'));
  const [authenticated, setAuthenticated] = useState(!storedPin);
  const [section, setSection] = useState<'record' | 'diary' | 'soundprint'>('record');
  const [recordings, setRecordings] = useState<Recording[]>(() => {
    const stored = localStorage.getItem('hearDiaryBase64Recordings');
    return stored ? JSON.parse(stored) : [];
  });
  const [recordingName, setRecordingName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playlistRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingSoundprint, setIsPlayingSoundprint] = useState(false);

  useEffect(() => {
    localStorage.setItem('hearDiaryBase64Recordings', JSON.stringify(recordings));
  }, [recordings]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const getDate = () => new Date().toISOString().split('T')[0];
  const getTimestamp = () => new Date().toLocaleString();

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const fetchTag = async (audio: string) => {
    setStatus('🔍 Analyzing...');
    try {
      const res = await fetch('https://heardiary-ai-backend.onrender.com/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio }),
      });
      const result = await res.json();
      setStatus('');
      return result.tag || 'unknown';
    } catch {
      setStatus('⚠️ Analysis failed.');
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
      setStatus('🔴 Recording...');
      intervalRef.current = setInterval(() => setElapsedTime((t) => t + 1), 1000);

      mediaRecorder.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        stream.getTracks().forEach((track) => track.stop());

        const duration = formatTime(elapsedTime);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const dataUrl = await blobToBase64(audioBlob);
        const tag = await fetchTag(dataUrl);
        const name = recordingName.trim() || `Recording ${getTimestamp()}`;
        const date = getDate();
        const aiScore = Math.random();

        setRecordings((prev) => [...prev, { name, dataUrl, time: duration, note: '', date, aiScore, tag }]);
        setRecordingName('');
        setIsRecording(false);
        setElapsedTime(0);
        setStatus('');
      };

      mediaRecorder.start();
    } catch (err) {
      console.error(err);
      setStatus('🎤 Microphone error.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
  };

  const deleteRecording = (index: number) =>
    setRecordings((prev) => prev.filter((_, i) => i !== index));

  const updateNote = (index: number, note: string) => {
    const updated = [...recordings];
    updated[index].note = note;
    setRecordings(updated);
  };

  const playSoundprint = () => {
    const list = recordings.filter((r) => r.date === selectedDate);
    if (!list.length) return;
    let current = 0;
    const audio = new Audio(list[current].dataUrl);
    playlistRef.current = audio;
    setIsPlayingSoundprint(true);
    audio.onended = () => {
      current++;
      if (current < list.length) {
        const next = new Audio(list[current].dataUrl);
        playlistRef.current = next;
        next.onended = audio.onended;
        next.play();
      } else setIsPlayingSoundprint(false);
    };
    audio.play();
  };

  const stopSoundprint = () => {
    playlistRef.current?.pause();
    setIsPlayingSoundprint(false);
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

  const handlePinSubmit = () => {
    if (!storedPin) {
      localStorage.setItem('heardiaryPin', pin);
      setStoredPin(pin);
      setAuthenticated(true);
    } else if (pin === storedPin) {
      setAuthenticated(true);
    } else {
      alert('Incorrect PIN');
    }
    setPin('');
  };

  const resetPin = () => {
    localStorage.removeItem('heardiaryPin');
    setStoredPin(null);
    setAuthenticated(false);
  };

  if (!authenticated) {
    return (
      <div className="center">
        <img src={logo} alt="logo" width={60} />
        <h2>{storedPin ? 'Enter PIN' : 'Set new PIN (4 digits)'}</h2>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value.slice(0, 4))}
          maxLength={4}
          className="pin-input"
        />
        <button onClick={handlePinSubmit}>OK</button>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : 'light'}>
      <div className="top-bar">
        <img src={logo} alt="logo" width={50} />
        <h1>HearDiary</h1>
        <button onClick={() => setDarkMode(!darkMode)}>{darkMode ? '☀️' : '🌙'}</button>
      </div>

      {status && <div className="status">{status}</div>}

      {section === 'record' && (
        <div className="section">
          <h2>🎙 Record</h2>
          <input
            placeholder="Recording name..."
            value={recordingName}
            onChange={(e) => setRecordingName(e.target.value)}
          />
          <div>
            <button onClick={startRecording} disabled={isRecording}>Start</button>
            <button onClick={stopRecording} disabled={!isRecording}>Stop</button>
            {isRecording && <p>⏱ {formatTime(elapsedTime)}</p>}
          </div>
        </div>
      )}

      {section === 'diary' && (
        <div className="section">
          <h2>📁 Diary</h2>
          {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => (
            <div key={date}>
              <h4>{date}</h4>
              {grouped[date].map((r, i) => (
                <div key={i} className="card">
                  <strong>{getTagIcon(r.tag)} {r.name}</strong> ({r.time})<br />
                  <audio controls src={r.dataUrl} />
                  <textarea
                    value={r.note || ''}
                    onChange={(e) => updateNote(recordings.indexOf(r), e.target.value)}
                    placeholder="Add note..."
                  />
                  <div>
                    <a href={r.dataUrl} download={r.name + '.wav'}>⬇️</a>
                    <button onClick={() => deleteRecording(recordings.indexOf(r))}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {section === 'soundprint' && (
        <div className="section">
          <h2>🎧 Soundprint</h2>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          {isPlayingSoundprint ? (
            <button onClick={stopSoundprint}>⏹ Stop</button>
          ) : (
            <button onClick={playSoundprint}>▶️ Play My Day</button>
          )}
        </div>
      )}

      <nav className="nav">
        <button onClick={() => { stopSoundprint(); setSection('record'); }}>🎙</button>
        <button onClick={() => { stopSoundprint(); setSection('diary'); }}>📁</button>
        <button onClick={() => setSection('soundprint')}>🎧</button>
        <button onClick={resetPin}>🔑 Reset PIN</button>
      </nav>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
