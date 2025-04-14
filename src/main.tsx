// main.tsx – v1.2 HearDiary (AI backend connected)
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
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
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

  const fetchTagsFromAI = async (dataUrl: string): Promise<string> => {
    try {
      const response = await fetch('https://heardiary-ai-backend.onrender.com/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl })
      });
      const result = await response.json();
      return result.label || 'unknown';
    } catch (error) {
      console.error('AI backend error:', error);
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

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const dataUrl = await blobToBase64(audioBlob);
        const tag = await fetchTagsFromAI(dataUrl);
        const date = new Date().toISOString().split('T')[0];

        setRecordings((prev) => [
          ...prev,
          {
            name: recordingName || `Recording ${new Date().toLocaleString()}`,
            dataUrl,
            time: formatTime(elapsedTime),
            note: '',
            date,
            aiScore: Math.random(),
            emotion: analyzeEmotion(),
            tag
          },
        ]);

        setRecordingName('');
        setIsRecording(false);
        setElapsedTime(0);
      };

      mediaRecorder.start();
    } catch (error) {
      console.error('Mic error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop();
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
        stopSoundprint();
      }
    };
    audio.play();
  };

  const grouped = recordings.reduce((acc, rec) => {
    acc[rec.date] = acc[rec.date] || [];
    acc[rec.date].push(rec);
    return acc;
  }, {} as Record<string, Recording[]>);

  const sortedDates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  const toggleTheme = () => setDarkMode((prev) => !prev);

  return (
    <div style={{ fontFamily: 'Arial', textAlign: 'center', background: darkMode ? '#111' : '#f9f9f9', color: darkMode ? '#eee' : '#111', minHeight: '100vh' }}>
      <button onClick={toggleTheme} style={{ position: 'absolute', top: 10, right: 16 }}>{darkMode ? '☀️' : '🌙'}</button>
      <img src={logo} alt="Logo" style={{ width: 56, margin: '1rem auto' }} />

      {section === 'record' && (
        <div>
          <h2>Record</h2>
          <input placeholder="Recording name..." value={recordingName} onChange={(e) => setRecordingName(e.target.value)} style={{ padding: 10, borderRadius: 10 }} />
          <div style={{ margin: '1rem' }}>
            <button onClick={startRecording} disabled={isRecording} style={{ backgroundColor: '#4caf50', color: 'white', padding: '0.5rem 1rem', borderRadius: 10 }}>Start</button>
            <button onClick={stopRecording} disabled={!isRecording} style={{ backgroundColor: '#f44336', color: 'white', padding: '0.5rem 1rem', borderRadius: 10, marginLeft: 8 }}>Stop</button>
          </div>
          {isRecording && <div>⏱ {formatTime(elapsedTime)}</div>}
        </div>
      )}

      {section === 'diary' && (
        <div>
          <h2>Diary</h2>
          {sortedDates.map(date => (
            <div key={date} style={{ marginBottom: '1.5rem' }}>
              <h4>{date}</h4>
              {grouped[date].map((rec, i) => (
                <div key={i} style={{ padding: '1rem', borderRadius: 10, background: darkMode ? '#222' : '#eee', marginBottom: 10 }}>
                  <strong>{rec.name}</strong> ({rec.time}) – <i>{rec.emotion}</i> – Tag: {rec.tag || 'unknown'} – Score: {rec.aiScore?.toFixed(2)}<br />
                  <audio controls src={rec.dataUrl} />
                  <textarea
                    placeholder="Add note..."
                    value={rec.note || ''}
                    onChange={(e) => {
                      const updated = [...recordings];
                      updated[recordings.indexOf(rec)].note = e.target.value;
                      setRecordings(updated);
                    }}
                    style={{ width: '90%', marginTop: 4, padding: 6, borderRadius: 8 }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {section === 'soundprint' && (
        <div>
          <h2>Soundprint</h2>
          <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ marginBottom: '1rem', padding: 8, borderRadius: 8 }}>
            {sortedDates.map((date) => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
          <div>
            {!isPlayingSoundprint ? (
              <button onClick={playSoundprint} style={{ backgroundColor: '#673ab7', color: 'white', padding: '0.5rem 1rem', borderRadius: 10 }}>▶️ Play My Day</button>
            ) : (
              <button onClick={stopSoundprint} style={{ backgroundColor: '#ff5722', color: 'white', padding: '0.5rem 1rem', borderRadius: 10 }}>⏹ Stop</button>
            )}
          </div>
        </div>
      )}

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', background: darkMode ? '#000' : '#fff', borderTop: '1px solid #ccc', padding: '0.5rem 0' }}>
        <button onClick={() => setSection('record')} style={{ background: 'none', border: 'none' }}>{section === 'record' ? '🎙️' : '🎙'}</button>
        <button onClick={() => setSection('diary')} style={{ background: 'none', border: 'none' }}>{section === 'diary' ? '📁' : '📂'}</button>
        <button onClick={() => setSection('soundprint')} style={{ background: 'none', border: 'none' }}>{section === 'soundprint' ? '🎧' : '🎵'}</button>
      </nav>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
