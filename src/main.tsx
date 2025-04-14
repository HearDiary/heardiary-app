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
  emotion?: string;
  tag?: string;
}

const App = () => {
  const [pin, setPin] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [section, setSection] = useState<'record' | 'diary' | 'soundprint'>('record');
  const [recordings, setRecordings] = useState<Recording[]>(() => {
    const stored = localStorage.getItem('hearDiaryBase64Recordings');
    return stored ? JSON.parse(stored) : [];
  });
  const [recordingName, setRecordingName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playlistRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingSoundprint, setIsPlayingSoundprint] = useState(false);

  useEffect(() => {
    localStorage.setItem('hearDiaryBase64Recordings', JSON.stringify(recordings));
  }, [recordings]);

  useEffect(() => {
    document.body.className = darkMode ? 'dark' : 'light';
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
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
        setElapsedTime(0);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const dataUrl = await blobToBase64(audioBlob);
        const tag = await fetchTagsFromAI(dataUrl);
        const name = recordingName.trim() || `Recording ${getTimestamp()}`;
        const date = getDateString();
        const aiScore = parseFloat((Math.random()).toFixed(2));
        setRecordings((prev) => [...prev, { name, dataUrl, time: formatTime(elapsedTime), note: '', date, aiScore, tag }]);
        setRecordingName('');
        setIsRecording(false);
      };
      mediaRecorder.start();
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
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
    const dayRecordings = recordings.filter((r) => r.date === selectedDate);
    if (!dayRecordings.length) return;
    let current = 0;
    const audio = new Audio(dayRecordings[current].dataUrl);
    playlistRef.current = audio;
    setIsPlayingSoundprint(true);
    audio.onended = () => {
      current++;
      if (current < dayRecordings.length) {
        const next = new Audio(dayRecordings[current].dataUrl);
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

  if (enteredPin !== pin) {
    return (
      <div className="centered">
        <h2>Enter your PIN</h2>
        <input value={enteredPin} onChange={e => setEnteredPin(e.target.value)} />
        <button onClick={() => setPin(enteredPin)}>Submit</button>
      </div>
    );
  }

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      <header>
        <img src={logo} alt="logo" className="logo" />
        <h1>HearDiary</h1>
        <label className="switch">
          <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
          <span className="slider round"></span>
        </label>
      </header>

      {section === 'record' && (
        <div className="card">
          <input value={recordingName} onChange={e => setRecordingName(e.target.value)} placeholder="Recording name..." />
          <div className="buttons">
            <button onClick={startRecording} disabled={isRecording}>Start</button>
            <button onClick={stopRecording} disabled={!isRecording}>Stop</button>
          </div>
          {isRecording && <div className="timer">⏱ {formatTime(elapsedTime)}</div>}
        </div>
      )}

      {section === 'diary' && (
        <div>
          {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => (
            <div key={date} className="card">
              <h3>{date}</h3>
              {grouped[date].map((r, i) => (
                <div key={i} className="entry">
                  <strong>{getTagIcon(r.tag)} {r.name}</strong> ({r.time}) – {r.emotion || 'unknown'} – Score: {r.aiScore}
                  <audio controls src={r.dataUrl}></audio>
                  <div className="entry-actions">
                    <a href={r.dataUrl} download={`${r.name}.wav`} className="download-btn">⬇️ Download</a>
                    <button onClick={() => setRecordings(prev => prev.filter((_, index) => prev.indexOf(r) !== index))}>🗑 Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {section === 'soundprint' && (
        <div className="card">
          <h3>Soundprint</h3>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          {isPlayingSoundprint ? (
            <button onClick={stopSoundprint}>⏹ Stop</button>
          ) : (
            <button onClick={playSoundprint}>▶️ Play My Day</button>
          )}
        </div>
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
