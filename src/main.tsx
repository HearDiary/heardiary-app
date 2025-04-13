// main.tsx
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

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

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
        setRecordings((prev) => [...prev, { name, dataUrl, time: duration, note: '', date, aiScore }]);
        setRecordingName('');
        setIsRecording(false);
      };

      mediaRecorder.start();
    } catch (error) {
      console.error('Mic error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
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
  const today = getDateString();

  const playSoundprint = () => {
    const todays = recordings.filter((r) => r.date === today);
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

  return (
    <div style={{
      fontFamily: 'Arial',
      textAlign: 'center',
      background: darkMode ? '#1e1e1e' : '#f0f4f8',
      color: darkMode ? '#eee' : '#000',
      minHeight: '100vh'
    }}>
      <button onClick={toggleTheme} style={{ position: 'absolute', top: 10, right: 16 }}>{darkMode ? '☀️' : '🌙'}</button>
      <img src={logo} alt="Logo" style={{ width: 48, margin: '1rem auto' }} />

      {section === 'record' && (
        <div>
          <h2>Record</h2>
          <input
            placeholder="Recording name..."
            value={recordingName}
            onChange={(e) => setRecordingName(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #ccc' }}
          />
          <div style={{ margin: '1rem' }}>
            <button onClick={startRecording} disabled={isRecording}
              style={{ background: '#4caf50', color: '#fff', borderRadius: 8, padding: '0.5rem 1rem', marginRight: 8 }}>
              Start
            </button>
            <button onClick={stopRecording} disabled={!isRecording}
              style={{ background: '#f44336', color: '#fff', borderRadius: 8, padding: '0.5rem 1rem' }}>
              Stop
            </button>
          </div>
          {isRecording && <div>⏱ {formatTime(elapsedTime)}</div>}
        </div>
      )}

      {section === 'diary' && (
        <div>
          <h2>Diary</h2>
          {sortedDates.map((date) => (
            <div key={date} style={{ marginBottom: '1.5rem' }}>
              <h4>{date}</h4>
              {grouped[date].map((rec, i) => (
                <div key={i} style={{ marginBottom: '1rem' }}>
                  <strong>{rec.name}</strong> ({rec.time}) – Score: {rec.aiScore?.toFixed(2)}<br />
                  <audio controls src={rec.dataUrl} /><br />
                  <textarea
                    value={rec.note || ''}
                    onChange={(e) => updateNote(recordings.indexOf(rec), e.target.value)}
                    placeholder="Add note..."
                    style={{ marginTop: '0.3rem', padding: '0.4rem', borderRadius: 8, width: '90%' }}
                  />
                  <div>
                    <a href={rec.dataUrl} download={rec.name + '.wav'} style={{ color: '#2196f3', marginRight: '1rem' }}>Download</a>
                    <button onClick={() => deleteRecording(recordings.indexOf(rec))} style={{ color: '#999' }}>Delete</button>
                  </div>
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
            style={{ backgroundColor: '#6200ea', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px' }}>
            ▶️ Play My Day
          </button>
        </div>
      )}

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-around',
        background: darkMode ? '#111' : '#fff',
        borderTop: '1px solid #ccc', padding: '0.5rem 0'
      }}>
        <button onClick={() => setSection('record')} style={{ background: 'none', border: 'none' }}>{section === 'record' ? '🎙️' : '🎙'}</button>
        <button onClick={() => setSection('diary')} style={{ background: 'none', border: 'none' }}>{section === 'diary' ? '📁' : '📂'}</button>
        <button onClick={() => setSection('soundprint')} style={{ background: 'none', border: 'none' }}>{section === 'soundprint' ? '🎧' : '🎵'}</button>
      </nav>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
