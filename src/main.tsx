import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
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
  const [darkMode, setDarkMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
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

  const getTimestamp = () => new Date().toLocaleString();
  const getDateString = () => new Date().toISOString().split('T')[0];

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const fetchTagsFromAI = async (base64Audio: string): Promise<{ tag: string; emotion: string; score: number }> => {
    try {
      const res = await fetch('https://heardiary-ai-backend.onrender.com/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio }),
      });
      const data = await res.json();
      return {
        tag: data.tag || 'unknown',
        emotion: data.emotion || 'neutral',
        score: data.score || 0,
      };
    } catch {
      return { tag: 'unknown', emotion: 'neutral', score: 0 };
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
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());

        const duration = formatTime(elapsedTime);
        setElapsedTime(0);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const dataUrl = await blobToBase64(blob);
        const { tag, emotion, score } = await fetchTagsFromAI(dataUrl);
        const name = recordingName.trim() || `Recording ${getTimestamp()}`;
        const date = getDateString();
        setRecordings((prev) => [...prev, { name, dataUrl, time: duration, note: '', date, aiScore: score, emotion, tag }]);
        setRecordingName('');
        setIsRecording(false);
      };

      mediaRecorder.start();
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
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
    const day = selectedDate || getDateString();
    const todays = recordings.filter((r) => r.date === day);
    if (!todays.length) return;
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

  const deleteRecording = (index: number) =>
    setRecordings((prev) => prev.filter((_, i) => i !== index));

  const grouped = recordings.reduce((acc, r) => {
    acc[r.date] = acc[r.date] || [];
    acc[r.date].push(r);
    return acc;
  }, {} as Record<string, Recording[]>);

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
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

  return (
    <div style={{
      background: darkMode ? '#121212' : '#f9f9f9',
      color: darkMode ? '#eee' : '#111',
      fontFamily: 'Arial',
      textAlign: 'center',
      minHeight: '100vh',
      paddingBottom: '5rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '1rem auto' }}>
        <img src={logo} alt="Logo" style={{ width: 36, marginRight: 12 }} />
        <h2 style={{ margin: 0 }}>HearDiary</h2>
        <button onClick={() => setDarkMode((d) => !d)} style={{ marginLeft: 'auto', marginRight: 12 }}>{darkMode ? '☀️' : '🌙'}</button>
      </div>

      {section === 'record' && (
        <div>
          <input value={recordingName} onChange={e => setRecordingName(e.target.value)} placeholder="Recording name..." style={{ padding: 10, borderRadius: 10 }} />
          <div style={{ marginTop: '1rem' }}>
            <button onClick={startRecording} disabled={isRecording} style={{ backgroundColor: 'green', color: 'white', marginRight: 10 }}>Start</button>
            <button onClick={stopRecording} disabled={!isRecording} style={{ backgroundColor: 'red', color: 'white' }}>Stop</button>
          </div>
          {isRecording && <div style={{ marginTop: 8 }}>⏱ {formatTime(elapsedTime)}</div>}
        </div>
      )}

      {section === 'diary' && (
        <div>
          {sortedDates.map(date => (
            <div key={date}>
              <h4>{date}</h4>
              {grouped[date].map((r, i) => (
                <div key={i} style={{
                  background: darkMode ? '#222' : '#eee',
                  borderRadius: 12,
                  padding: 12,
                  margin: '1rem auto',
                  width: '90%'
                }}>
                  <strong>{getTagIcon(r.tag)} {r.name}</strong> ({r.time}) – {r.emotion} – Score: {r.aiScore?.toFixed(2)}<br />
                  <audio controls src={r.dataUrl} style={{ width: '100%' }} />
                  <div>
                    <a href={r.dataUrl} download={r.name + '.wav'} style={{ marginRight: 16 }}>⬇️ Download</a>
                    <button onClick={() => deleteRecording(recordings.indexOf(r))}>🗑 Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {section === 'soundprint' && (
        <div>
          <h3>Soundprint</h3>
          <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
            <option value="">Today</option>
            {sortedDates.map(date => <option key={date} value={date}>{date}</option>)}
          </select>
          <div style={{ marginTop: 10 }}>
            {isPlayingSoundprint
              ? <button onClick={stopSoundprint}>⏹ Stop</button>
              : <button onClick={playSoundprint}>▶️ Play My Day</button>
            }
          </div>
        </div>
      )}

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-around',
        padding: '0.5rem', borderTop: '1px solid #ccc',
        background: darkMode ? '#000' : '#fff'
      }}>
        <button onClick={() => { stopSoundprint(); setSection('record'); }}>🎙</button>
        <button onClick={() => { stopSoundprint(); setSection('diary'); }}>📁</button>
        <button onClick={() => setSection('soundprint')}>🎧</button>
      </nav>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
