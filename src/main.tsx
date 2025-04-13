// main.tsx (opravené prehrávanie, zastavenie koláže, bezpečné stopRecording)
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
  const [isPlayingSoundprint, setIsPlayingSoundprint] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playlistRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem('hearDiaryBase64Recordings', JSON.stringify(recordings));
  }, [recordings]);

  useEffect(() => {
    if (section !== 'soundprint') stopSoundprint();
  }, [section]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const getDateString = () => new Date().toISOString().split('T')[0];
  const getTimestamp = () => new Date().toLocaleString();

  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const analyzeEmotion = (): string => {
    const emotions = ['happy', 'nostalgic', 'calm', 'neutral', 'stressed'];
    return emotions[Math.floor(Math.random() * emotions.length)];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setIsRecording(true);
      setElapsedTime(0);
      intervalRef.current = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);

      recorder.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        setElapsedTime(0);

        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const dataUrl = await blobToBase64(blob);
        const name = recordingName.trim() || `Recording ${getTimestamp()}`;
        const newRecording: Recording = {
          name,
          dataUrl,
          time: formatTime(elapsedTime),
          date: getDateString(),
          aiScore: Math.random(),
          emotion: analyzeEmotion(),
        };
        setRecordings((prev) => [...prev, newRecording]);
        setRecordingName('');
        setIsRecording(false);
      };

      recorder.start();
    } catch (err) {
      console.error('Mic error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const playSoundprint = () => {
    const todays = recordings.filter((r) => r.date === getDateString());
    if (!todays.length) return;
    let current = 0;
    const playNext = () => {
      if (current >= todays.length) return setIsPlayingSoundprint(false);
      const audio = new Audio(todays[current++].dataUrl);
      playlistRef.current = audio;
      audio.onended = playNext;
      audio.play();
    };
    setIsPlayingSoundprint(true);
    playNext();
  };

  const stopSoundprint = () => {
    playlistRef.current?.pause();
    playlistRef.current = null;
    setIsPlayingSoundprint(false);
  };

  const deleteRecording = (index: number) => setRecordings((r) => r.filter((_, i) => i !== index));
  const toggleTheme = () => setDarkMode((prev) => !prev);
  const grouped = recordings.reduce((acc, rec) => {
    acc[rec.date] = acc[rec.date] || [];
    acc[rec.date].push(rec);
    return acc;
  }, {} as Record<string, Recording[]>);

  return (
    <div style={{ fontFamily: 'Arial', textAlign: 'center', background: darkMode ? '#111' : '#f4f4f4', color: darkMode ? '#fff' : '#000', minHeight: '100vh' }}>
      <button onClick={toggleTheme} style={{ position: 'absolute', top: 10, right: 10 }}>{darkMode ? '☀️' : '🌙'}</button>
      <img src={logo} alt="Logo" style={{ width: 60, margin: '1rem auto' }} />

      {section === 'record' && (
        <div>
          <h2>Record</h2>
          <input
            placeholder="Recording name..."
            value={recordingName}
            onChange={(e) => setRecordingName(e.target.value)}
            style={{ padding: 8, borderRadius: 8 }}
          />
          <div style={{ margin: '1rem' }}>
            <button onClick={startRecording} disabled={isRecording} style={{ background: 'green', color: '#fff', padding: '0.5rem 1rem', borderRadius: 8, marginRight: 8 }}>Start</button>
            <button onClick={stopRecording} disabled={!isRecording} style={{ background: 'red', color: '#fff', padding: '0.5rem 1rem', borderRadius: 8 }}>Stop</button>
          </div>
          {isRecording && <div>⏱ {formatTime(elapsedTime)}</div>}
        </div>
      )}

      {section === 'diary' && (
        <div>
          <h2>Diary</h2>
          {Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1)).map(date => (
            <div key={date}>
              <h4>{date}</h4>
              {grouped[date].map((rec, i) => (
                <div key={i} style={{ margin: '1rem', padding: 12, borderRadius: 10, background: darkMode ? '#222' : '#eee' }}>
                  <strong>{rec.name}</strong> ({rec.time}) – {rec.emotion} – Score: {rec.aiScore?.toFixed(2)}<br />
                  <audio controls src={rec.dataUrl} />
                  <br />
                  <a href={rec.dataUrl} download={rec.name + '.wav'}>Download</a>
                  <button onClick={() => deleteRecording(recordings.indexOf(rec))} style={{ marginLeft: 10 }}>Delete</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {section === 'soundprint' && (
        <div>
          <h2>Soundprint</h2>
          <button
            onClick={playSoundprint}
            disabled={isPlayingSoundprint}
            style={{ backgroundColor: '#673ab7', color: 'white', padding: '0.5rem 1.2rem', borderRadius: 10 }}>
            ▶️ Play My Day
          </button>
          {isPlayingSoundprint && (
            <button
              onClick={stopSoundprint}
              style={{ backgroundColor: '#ccc', color: '#000', padding: '0.5rem 1rem', marginLeft: 10, borderRadius: 10 }}>
              ⏹ Stop
            </button>
          )}
        </div>
      )}

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: '0.5rem 0', background: darkMode ? '#000' : '#fff' }}>
        <button onClick={() => setSection('record')}>{section === 'record' ? '🎙️' : '🎙'}</button>
        <button onClick={() => setSection('diary')}>{section === 'diary' ? '📁' : '📂'}</button>
        <button onClick={() => setSection('soundprint')}>{section === 'soundprint' ? '🎧' : '🎵'}</button>
      </nav>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
