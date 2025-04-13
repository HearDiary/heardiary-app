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
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    localStorage.setItem('hearDiaryBase64Recordings', JSON.stringify(recordings));
  }, [recordings]);

  useEffect(() => {
    if (section !== 'soundprint' && playlistRef.current) {
      playlistRef.current.pause();
      playlistRef.current = null;
      setIsPlayingSoundprint(false);
    }
  }, [section]);

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

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolume(avg);
        if (isRecording) requestAnimationFrame(updateVolume);
      };
      updateVolume();

      mediaRecorder.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
        setVolume(0);

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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const playSoundprint = () => {
    const todays = recordings.filter((r) => r.date === getDateString());
    if (!todays.length) return;
    let current = 0;
    const playNext = () => {
      const audio = new Audio(todays[current].dataUrl);
      playlistRef.current = audio;
      setIsPlayingSoundprint(true);
      audio.onended = () => {
        current++;
        if (current < todays.length) playNext();
        else setIsPlayingSoundprint(false);
      };
      audio.play();
    };
    playNext();
  };

  const stopSoundprint = () => {
    if (playlistRef.current) {
      playlistRef.current.pause();
      playlistRef.current = null;
      setIsPlayingSoundprint(false);
    }
  };

  const grouped = recordings.reduce((acc, rec) => {
    acc[rec.date] = acc[rec.date] || [];
    acc[rec.date].push(rec);
    return acc;
  }, {} as Record<string, Recording[]>);

  const sortedDates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div style={{ fontFamily: 'Arial', textAlign: 'center', background: darkMode ? '#121212' : '#f9f9f9', color: darkMode ? '#eee' : '#111', minHeight: '100vh' }}>
      <button onClick={() => setDarkMode(!darkMode)} style={{ position: 'absolute', top: 10, right: 16 }}>{darkMode ? '☀️' : '🌙'}</button>
      <img src={logo} alt="Logo" style={{ width: 56, margin: '1rem auto' }} />

      {section === 'record' && (
        <div>
          <h2>Record</h2>
          <input value={recordingName} onChange={(e) => setRecordingName(e.target.value)} placeholder="Recording name..." style={{ padding: 10, borderRadius: 10, border: '1px solid #ccc' }} />
          <div style={{ margin: '1rem' }}>
            <button onClick={startRecording} disabled={isRecording} style={{ backgroundColor: '#43a047', color: 'white', padding: '0.5rem 1rem', borderRadius: 10, marginRight: 8 }}>Start</button>
            <button onClick={stopRecording} disabled={!isRecording} style={{ backgroundColor: '#e53935', color: 'white', padding: '0.5rem 1rem', borderRadius: 10 }}>Stop</button>
          </div>
          {isRecording && (
            <>
              <div>⏱ {formatTime(elapsedTime)}</div>
              <div style={{ marginTop: '1rem', width: '60%', height: 12, margin: '0 auto', background: '#ddd', borderRadius: 8 }}>
                <div style={{ height: '100%', width: `${Math.min(volume, 100)}%`, background: '#4caf50', borderRadius: 8 }}></div>
              </div>
            </>
          )}
        </div>
      )}

      {section === 'diary' && (
        <div>
          <h2>Diary</h2>
          {sortedDates.map(date => (
            <div key={date} style={{ marginBottom: '1.5rem' }}>
              <h4>{date}</h4>
              {grouped[date].map((rec, i) => (
                <div key={i} style={{ padding: '1rem', marginBottom: '1rem', borderRadius: 10, background: darkMode ? '#222' : '#eee' }}>
                  <strong>{rec.name}</strong> ({rec.time}) – <span style={{ color: '#8e24aa' }}>{rec.emotion}</span> – Score: {rec.aiScore?.toFixed(2)}<br />
                  <audio controls src={rec.dataUrl} />
                  <textarea value={rec.note || ''} onChange={(e) => {
                    const updated = [...recordings];
                    updated[recordings.indexOf(rec)].note = e.target.value;
                    setRecordings(updated);
                  }} style={{ marginTop: '0.3rem', padding: '0.4rem', borderRadius: 8, width: '90%' }} placeholder="Add note..." />
                  <div>
                    <a href={rec.dataUrl} download={rec.name + '.wav'} style={{ color: '#2196f3', marginRight: '1rem' }}>Download</a>
                    <button onClick={() => setRecordings(prev => prev.filter((_, j) => j !== recordings.indexOf(rec)))} style={{ color: '#999' }}>Delete</button>
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
          <button onClick={playSoundprint} disabled={isPlayingSoundprint} style={{ backgroundColor: '#5e35b1', color: 'white', padding: '0.5rem 1.2rem', borderRadius: 10, marginRight: 8 }}>▶️ Play My Day</button>
          <button onClick={stopSoundprint} disabled={!isPlayingSoundprint} style={{ backgroundColor: '#757575', color: 'white', padding: '0.5rem 1.2rem', borderRadius: 10 }}>⏹ Stop</button>
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

