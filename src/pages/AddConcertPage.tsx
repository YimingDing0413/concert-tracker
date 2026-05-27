import { api } from '@/api';
import { Button } from '@/components/ui/app-button';
import { useAuth } from '@/context/AuthContext';
import type { UserConcertStatus } from '@/types';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function AddConcertPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [artistName, setArtistName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [openers, setOpeners] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<UserConcertStatus>('attended');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      await api.addManualConcert(user.id, {
        artistName,
        venueName,
        city,
        state: state || undefined,
        date,
        startTime: startTime || undefined,
        openers: openers || undefined,
        notes: notes || undefined,
        status,
      });
      navigate('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>Add Concert</h1>
      <p className="muted">Log a show that isn&apos;t in the catalog yet.</p>
      <form className="card form-stack" onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <label>
          Artist <span className="req">*</span>
          <input value={artistName} onChange={(e) => setArtistName(e.target.value)} required />
        </label>
        <label>
          Venue
          <input value={venueName} onChange={(e) => setVenueName(e.target.value)} />
        </label>
        <div className="form-row">
          <label>
            City <span className="req">*</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} required />
          </label>
          <label>
            State
            <input value={state} onChange={(e) => setState(e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Date <span className="req">*</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Start time
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
        </div>
        <label>
          Openers
          <input value={openers} onChange={(e) => setOpeners(e.target.value)} placeholder="Comma-separated" />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as UserConcertStatus)}>
            <option value="attended">Attended</option>
            <option value="going">Going</option>
            <option value="saved">Saved</option>
          </select>
        </label>
        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Saving…' : 'Save concert'}
        </Button>
      </form>
    </div>
  );
}
