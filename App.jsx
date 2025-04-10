
import { useState } from 'react'

export default function App() {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState([]);

  const handleRecord = () => {
    setRecording((prev) => !prev);
    if (!recording) {
      setTimeout(() => {
        setAudioUrl('/sample-audio.mp3');
        setRecording(false);
      }, 2000);
    }
  };

  const handleSave = () => {
    if (!note && !audioUrl) return;
    const newEntry = { id: Date.now(), note, audioUrl };
    setEntries([newEntry, ...entries]);
    setNote('');
    setAudioUrl(null);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 36, color: '#4F46E5' }}>HearDiary</h1>

      <button onClick={handleRecord} style={{ margin: '16px 0', padding: '10px 20px', backgroundColor: recording ? '#EF4444' : '#4F46E5', color: '#fff', borderRadius: 8 }}>
        {recording ? 'Recording...' : 'Start Recording'}
      </button>

      {audioUrl && <audio controls src={audioUrl} style={{ width: '100%', marginBottom: 16 }} />}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Write a note about today..."
        rows={4}
        style={{ width: '100%', padding: 12, borderRadius: 8, marginBottom: 16 }}
      />

      <button onClick={handleSave} style={{ padding: '10px 20px', backgroundColor: '#10B981', color: '#fff', borderRadius: 8 }}>
        Save Entry
      </button>

      <div style={{ marginTop: 32 }}>
        {entries.map((entry) => (
          <div key={entry.id} style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: 16 }}>
            {entry.audioUrl && <audio controls src={entry.audioUrl} style={{ width: '100%', marginBottom: 8 }} />}
            <p>{entry.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
