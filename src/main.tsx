// AI-enhanced main.tsx (HearDiary - extended with soundprint generation and styled UI)
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

  const analyzeEmotion = (): string => {
    const emotions = ['calm', 'happy', 'nostalgic', 'stressed', 'neutral'];
    return emotions[Math.floor(Math.random() * emotions.length)];
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
        const name = recordingName.trim() || `Recording ${getTimestamp()}`;
        const date = getDateString();
        const aiScore = Math.random();
        const emotion = analyzeEmotion();

        setRecordings((prev) => [...prev, { name, dataUrl, time: duration, note: '', date, aiScore, emotion }]);
        setRecordingName('');
        setIsRecording(false);
      };

      mediaRecorder.start();
    } catch (error) {
      console.error('Mic error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop();
  };

  const playSoundprint = () => {
    const todays = recordings.filter((r) => r.date === getDateString());
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

  const deleteRecording = (index: number) => setRecordings((prev) => prev.filter((_, i) => i !== index));
  const updateNote = (index: number, note: string) => {
    setRecordings((prev) => {
      const updated = [...prev];
      updated[index].note = note;
      return updated;
    });
  };

  const toggleTheme = () => setDarkMode((prev) => !prev);
  const grouped = recordings.reduce((acc, rec) => {
    acc[rec.date] = acc[rec.date] || [];
    acc[rec.date].push(rec);
    return acc;
  }, {} as Record<string, Recording[]>);
  const sortedDates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div style={{ fontFamily: 'Arial', textAlign: 'center', background: darkMode ? '#121212' : '#f9f9f9', color: darkMode ? '#eee' : '#111', minHeight: '100vh', paddingBottom: '4rem' }}>
      <button onClick={toggleTheme} style={{ position: 'absolute', top: 10, right: 16 }}>{darkMode ? '☀️' : '🌙'}</button>
      <img src={logo} alt="Logo" style={{ width: 64, margin: '1rem auto' }} />

      {section === 'record' && (
        <div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Record</h2>
          <input
            value={recordingName}
            onChange={(e) => setRecordingName(e.target.value)}
            placeholder="Recording name..."
            style={{ padding: 12, borderRadius: 12, border: '1px solid #ccc', width: '80%', maxWidth: 300 }}
          />
          <div style={{ margin: '1rem' }}>
            <button onClick={startRecording} disabled={isRecording} style={{ backgroundColor: '#43a047', color: 'white', padding: '0.7rem 1.5rem', borderRadius: 12, marginRight: 8 }}>Start</button>
            <button onClick={stopRecording} disabled={!isRecording} style={{ backgroundColor: '#e53935', color: 'white', padding: '0.7rem 1.5rem', borderRadius: 12 }}>Stop</button>
          </div>
          {isRecording && <div style={{ fontSize: '1.2rem', marginTop: '1rem' }}>⏱ {formatTime(elapsedTime)}</div>}
        </div>
      )}

      {section === 'diary' && (
        <div>
          <h2 style={{ fontSize: '1.8rem', margin: '1rem 0' }}>Diary</h2>
          {sortedDates.map(date => (
            <div key={date} style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: 8 }}>{date}</h4>
              {grouped[date].map((rec, i) => (
                <div key={i} style={{ padding: '1rem', margin: '0 auto 1rem', borderRadius: 12, background: darkMode ? '#222' : '#eee', width: '90%', maxWidth: 420 }}>
                  <strong>{rec.name}</strong> ({rec.time})<br />
                  {rec.emotion && <span style={{ fontSize: '0.9rem', color: '#999' }}>Mood: {rec.emotion} | Score: {rec.aiScore?.toFixed(2)}</span>}<br />
                  <audio controls src={rec.dataUrl} style={{ marginTop: 8, width: '100%' }} />
                  <textarea
                    value={rec.note || ''}
                    onChange={(e) => updateNote(recordings.indexOf(rec), e.target.value)}
                    placeholder="Add note..."
                    style={{ marginTop: '0.5rem', padding: '0.5rem', borderRadius: 8, width: '100%' }}
                  />
                  <div style={{ marginTop: 8 }}>
                    <a href={rec.dataUrl} download={rec.name + '.wav'} style={{ color: '#2196f3', marginRight: '1rem' }}>Download</a>
                    <button onClick={() => deleteRecording(recordings.indexOf(rec))} style={{ color: '#999', border: 'none', background: 'transparent' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {section === 'soundprint' && (
        <div>
          <h2 style={{ fontSize: '1.8rem', margin: '1rem 0' }}>Soundprint</h2>
          <button
            onClick={playSoundprint}
            disabled={isPlayingSoundprint}
            style={{ backgroundColor: '#5e35b1', color: 'white', padding: '0.7rem 1.5rem', borderRadius: 12 }}>
            ▶️ Play My Day
          </button>
        </div>
      )}

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', background: darkMode ? '#000' : '#fff', borderTop: '1px solid #ccc', padding: '0.6rem 0' }}>
        <button onClick={() => setSection('record')} style={{ background: 'none', border: 'none', fontSize: '1.4rem' }}>{section === 'record' ? '🎙️' : '🎙'}</button>
        <button onClick={() => setSection('diary')} style={{ background: 'none', border: 'none', fontSize: '1.4rem' }}>{section === 'diary' ? '📁' : '📂'}</button>
        <button onClick={() => setSection('soundprint')} style={{ background: 'none', border: 'none', fontSize: '1.4rem' }}>{section === 'soundprint' ? '🎧' : '🎵'}</button>
      </nav>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
