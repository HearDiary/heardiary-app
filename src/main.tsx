// main.tsx – HearDiary (vizuálne vylepšenie + štatistika)
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

  const grouped = recordings.reduce((acc, rec) => {
    acc[rec.date] = acc[rec.date] || [];
    acc[rec.date].push(rec);
    return acc;
  }, {} as Record<string, Recording[]>);

  const sortedDates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));
  const today = getDateString();
  const todayRecs = grouped[today] || [];
  const emotionStats = todayRecs.reduce((acc, rec) => {
    acc[rec.emotion || 'neutral'] = (acc[rec.emotion || 'neutral'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ fontFamily: 'Segoe UI', background: '#f5f7fa', minHeight: '100vh', paddingBottom: '5rem' }}>
      <div style={{ textAlign: 'center', padding: '1rem' }}>
        <img src={logo} alt="HearDiary" style={{ height: 48 }} />
        <h1 style={{ margin: '0.5rem 0', fontWeight: 600 }}>HearDiary</h1>
      </div>

      {section === 'record' && (
        <div style={{ textAlign: 'center' }}>
          <h2>🎙️ Record</h2>
          <input
            value={recordingName}
            onChange={(e) => setRecordingName(e.target.value)}
            placeholder="Recording name..."
            style={{ padding: '0.6rem 1rem', borderRadius: 10, width: '80%', marginBottom: '1rem' }}
          />
          <div>
            <button onClick={startRecording} disabled={isRecording} style={{ backgroundColor: '#43a047', color: 'white', padding: '0.6rem 1.4rem', borderRadius: 10, marginRight: 8 }}>Start</button>
            <button onClick={stopRecording} disabled={!isRecording} style={{ backgroundColor: '#e53935', color: 'white', padding: '0.6rem 1.4rem', borderRadius: 10 }}>Stop</button>
          </div>
          {isRecording && <div style={{ marginTop: '1rem' }}>⏱ {formatTime(elapsedTime)}</div>}
        </div>
      )}

      {section === 'diary' && (
        <div style={{ padding: '1rem' }}>
          <h2>📁 Diary</h2>
          {sortedDates.map(date => (
            <div key={date} style={{ marginBottom: '1.5rem' }}>
              <h4>{date}</h4>
              {grouped[date].map((rec, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 12, padding: '1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
                  <strong>{rec.name}</strong> ({rec.time}) <br />
                  <span style={{ color: '#555' }}>{rec.emotion} – Score: {rec.aiScore?.toFixed(2)}</span>
                  <audio controls src={rec.dataUrl} style={{ marginTop: '0.5rem', width: '100%' }} />
                  <textarea
                    value={rec.note || ''}
                    onChange={(e) => {
                      const updated = [...recordings];
                      updated[recordings.indexOf(rec)].note = e.target.value;
                      setRecordings(updated);
                    }}
                    placeholder="Add note..."
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 8, marginTop: 8 }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {section === 'soundprint' && (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <h2>🎧 Soundprint</h2>
          <p style={{ fontSize: 14, color: '#555' }}>Today: {todayRecs.length} recordings</p>
          <div style={{ fontSize: 12, color: '#777', marginBottom: '1rem' }}>
            {Object.entries(emotionStats).map(([emotion, count]) => (
              <span key={emotion} style={{ marginRight: 8 }}>{emotion}: {count}</span>
            ))}
          </div>
          <button
            onClick={() => {
              let index = 0;
              const audios = todayRecs.map(r => new Audio(r.dataUrl));
              const playNext = () => {
                if (index < audios.length) {
                  audios[index].onended = playNext;
                  audios[index].play();
                  index++;
                }
              };
              playNext();
            }}
            disabled={!todayRecs.length || isPlayingSoundprint}
            style={{ background: '#673ab7', color: '#fff', borderRadius: 12, padding: '0.6rem 1.6rem', fontSize: 16 }}>
            ▶️ Play My Day
          </button>
        </div>
      )}

      <nav style={{ position: 'fixed', bottom: 0, width: '100%', display: 'flex', justifyContent: 'space-around', background: '#fff', borderTop: '1px solid #ddd', padding: '0.6rem 0' }}>
        <button onClick={() => setSection('record')} style={{ background: 'none', border: 'none', fontSize: 20 }}>{section === 'record' ? '🎙️' : '🎙'}</button>
        <button onClick={() => setSection('diary')} style={{ background: 'none', border: 'none', fontSize: 20 }}>{section === 'diary' ? '📁' : '📂'}</button>
        <button onClick={() => setSection('soundprint')} style={{ background: 'none', border: 'none', fontSize: 20 }}>{section === 'soundprint' ? '🎧' : '🎵'}</button>
      </nav>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
