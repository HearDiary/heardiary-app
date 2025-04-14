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
  const [selectedDate, setSelectedDate] = useState<string>('');
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

  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const fetchTagsFromAI = async (base64Audio: string): Promise<{ tag: string; score: number; emotion: string }> => {
    try {
      const response = await fetch('https://heardiary-ai-backend.onrender.com/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio })
      });
      const result = await response.json();
      return {
        tag: result.tag || 'unknown',
        score: result.score || 0,
        emotion: result.emotion || 'neutral'
      };
    } catch {
      return { tag: 'unknown', score: 0, emotion: 'neutral' };
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
        const { tag, score, emotion } = await fetchTagsFromAI(dataUrl);
        const name = recordingName.trim() || `Recording ${getTimestamp()}`;
        const date = getDateString();

        setRecordings((prev) => [...prev, { name, dataUrl, time: duration, note: '', date, aiScore: score, tag, emotion }]);
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

  const toggleTheme = () => setDarkMode(prev => !prev);

  const deleteRecording = (index: number) => {
    setRecordings((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: darkMode ? '#121212' : '#f5f5f5', color: darkMode ? '#fff' : '#000', minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
        <div style={{ flex: 1 }}></div>
        <img src={logo} alt="logo" width={48} style={{ margin: '0 auto' }} />
        <button onClick={toggleTheme} style={{ flex: 1, textAlign: 'right' }}>{darkMode ? '☀️' : '🌙'}</button>
      </div>
      <h2 style={{ textAlign: 'center' }}>HearDiary</h2>

      <div style={{ textAlign: 'center' }}>
        {section === 'record' && (
          <div>
            <input value={recordingName} onChange={e => setRecordingName(e.target.value)} placeholder="Recording name..." style={{ padding: 8, width: '80%', borderRadius: 10 }} />
            <div style={{ margin: '1rem' }}>
              <button onClick={startRecording} disabled={isRecording} style={{ background: '#43a047', color: '#fff', padding: '0.5rem 1rem', borderRadius: 8, marginRight: 8 }}>Start</button>
              <button onClick={stopRecording} disabled={!isRecording} style={{ background: '#e53935', color: '#fff', padding: '0.5rem 1rem', borderRadius: 8 }}>Stop</button>
            </div>
            {isRecording && <div>⏱ {formatTime(elapsedTime)}</div>}
          </div>
        )}

        {section === 'diary' && (
          <div style={{ padding: 16 }}>
            {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => (
              <div key={date}>
                <h4>{date}</h4>
                {grouped[date].map((r, i) => (
                  <div key={i} style={{ marginBottom: 12, background: darkMode ? '#222' : '#eee', padding: 10, borderRadius: 10 }}>
                    <strong>{getTagIcon(r.tag)} {r.name}</strong> ({r.time}) – {r.emotion || 'neutral'} – Score: {r.aiScore?.toFixed(2)}<br />
                    <audio controls src={r.dataUrl} style={{ marginTop: 8 }} />
                    <div style={{ marginTop: 6 }}>
                      <a href={r.dataUrl} download={`${r.name}.wav`} style={{ marginRight: 16 }}>⬇️ Download</a>
                      <button onClick={() => deleteRecording(recordings.indexOf(r))}>🗑️ Delete</button>
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
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: 6, borderRadius: 6, marginBottom: 12 }} />
            {isPlayingSoundprint ? (
              <button onClick={stopSoundprint}>⏹ Stop</button>
            ) : (
              <button onClick={playSoundprint}>▶️ Play My Day</button>
            )}
          </div>
        )}
      </div>

      <nav style={{ position: 'fixed', bottom: 0, width: '100%', display: 'flex', justifyContent: 'space-around', padding: 12, background: darkMode ? '#000' : '#fff', borderTop: '1px solid #ccc' }}>
        <button onClick={() => { stopSoundprint(); setSection('record'); }}>🎙</button>
        <button onClick={() => { stopSoundprint(); setSection('diary'); }}>📁</button>
        <button onClick={() => setSection('soundprint')}>🎧</button>
      </nav>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
