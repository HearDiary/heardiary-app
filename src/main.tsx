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
  const [isPlayingSoundprint, setIsPlayingSoundprint] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playlistRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem('hearDiaryBase64Recordings', JSON.stringify(recordings));
  }, [recordings]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

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

        const duration = formatTime(elapsedTime);
        setElapsedTime(0);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const dataUrl = await blobToBase64(audioBlob);
        const tag = await fetchTagsFromAI(dataUrl);
        const name = recordingName.trim() || `Recording ${getTimestamp()}`;
        const date = getDateString();
        const aiScore = Math.random();

        setRecordings((prev) => [...prev, { name, dataUrl, time: duration, note: '', date, aiScore, tag }]);
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
    const filtered = recordings.filter(r => r.date === day);
    if (!filtered.length) return;

    let current = 0;
    const audio = new Audio(filtered[current].dataUrl);
    playlistRef.current = audio;
    setIsPlayingSoundprint(true);

    const playNext = () => {
      current++;
      if (current < filtered.length) {
        const next = new Audio(filtered[current].dataUrl);
        playlistRef.current = next;
        next.onended = playNext;
        next.play();
      } else {
        setIsPlayingSoundprint(false);
      }
    };

    audio.onended = playNext;
    audio.play();
  };

  const deleteRecording = (index: number) => {
    setRecordings((prev) => prev.filter((_, i) => i !== index));
  };

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

  const grouped = recordings.reduce((acc, r) => {
    acc[r.date] = acc[r.date] || [];
    acc[r.date].push(r);
    return acc;
  }, {} as Record<string, Recording[]>);

  return (
    <div>
      <img src={logo} alt="logo" width={40} style={{ margin: '10px auto', display: 'block' }} />
      <h2 style={{ textAlign: 'center' }}>HearDiary</h2>

      {section === 'record' && (
        <div style={{ textAlign: 'center' }}>
          <input value={recordingName} onChange={e => setRecordingName(e.target.value)} placeholder="Recording name..." />
          <br /><br />
          <button onClick={startRecording} disabled={isRecording}>Start</button>
          <button onClick={stopRecording} disabled={!isRecording}>Stop</button>
          {isRecording && <div>⏱ {formatTime(elapsedTime)}</div>}
        </div>
      )}

      {section === 'diary' && (
        <div>
          {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => (
            <div key={date}>
              <h4>{date}</h4>
              {grouped[date].map((r, i) => (
                <div key={i}>
                  <strong>{getTagIcon(r.tag)} {r.name}</strong> ({r.time})<br />
                  <audio controls src={r.dataUrl} />
                  <div>
                    <a href={r.dataUrl} download={`hear_${r.name}.wav`}>Download</a>
                    <button onClick={() => deleteRecording(recordings.indexOf(r))}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {section === 'soundprint' && (
        <div style={{ textAlign: 'center' }}>
          <h3>Soundprint</h3>
          <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
            {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
          <br />
          {isPlayingSoundprint ? (
            <button onClick={stopSoundprint}>⏹ Stop</button>
          ) : (
            <button onClick={playSoundprint}>▶️ Play My Day</button>
          )}
        </div>
      )}

      <nav style={{ marginTop: '20px', textAlign: 'center' }}>
        <button onClick={() => { stopSoundprint(); setSection('record'); }}>🎙</button>
        <button onClick={() => { stopSoundprint(); setSection('diary'); }}>📁</button>
        <button onClick={() => { stopSoundprint(); setSection('soundprint'); }}>🎧</button>
      </nav>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
