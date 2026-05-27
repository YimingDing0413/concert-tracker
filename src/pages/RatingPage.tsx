import { api } from '@/api';
import { Button } from '@/components/ui/app-button';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StarRating } from '@/components/ui/StarRating';
import { useAuth } from '@/context/AuthContext';
import type { ConcertDetail, RatingInput, UserConcert } from '@/types';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

const defaultRatings: RatingInput = {
  overall: 0,
  venue: 0,
  crowd: 0,
  sound: 0,
  setlist: 0,
  review: '',
};

export function RatingPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [userConcert, setUserConcert] = useState<UserConcert | null>(null);
  const [input, setInput] = useState<RatingInput>(defaultRatings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    setLoading(true);
    Promise.all([
      api.getConcert(id),
      api.getUserConcerts(user.id),
      api.getRating(user.id, id),
    ])
      .then(([c, ucs, r]) => {
        setConcert(c);
        setUserConcert(ucs.find((uc) => uc.concertId === id) ?? null);
        if (r) {
          setInput({
            overall: r.overall,
            venue: r.venue,
            crowd: r.crowd,
            sound: r.sound,
            setlist: r.setlist,
            review: r.review ?? '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !id) return;
    let uc = userConcert;
    if (!uc) {
      uc = await api.setConcertStatus(user.id, id, 'attended', concert ?? undefined);
    }
    setSaving(true);
    try {
      await api.saveRating(user.id, uc.id, id, input);
      navigate(`/concert/${id}`, { state: location.state });
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof RatingInput>(key: K, value: RatingInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return <LoadingSpinner />;
  if (!concert) return <p className="muted">Concert not found.</p>;

  return (
    <div className="page">
      <PageHeader
        title="Rate show"
        subtitle={`${concert.artistName} @ ${concert.venueName}`}
        backTo={`/concert/${id}`}
      />
      <form className="card form-stack rating-form" onSubmit={handleSubmit}>
        <StarRating label="Overall" value={input.overall} onChange={(v) => setField('overall', v)} />
        <StarRating label="Venue" value={input.venue} onChange={(v) => setField('venue', v)} />
        <StarRating label="Crowd / energy" value={input.crowd} onChange={(v) => setField('crowd', v)} />
        <StarRating label="Sound" value={input.sound} onChange={(v) => setField('sound', v)} />
        <StarRating label="Setlist" value={input.setlist} onChange={(v) => setField('setlist', v)} />
        <label>
          Review (optional)
          <textarea
            value={input.review}
            onChange={(e) => setField('review', e.target.value)}
            rows={4}
            placeholder="How was the night?"
          />
        </label>
        <Button type="submit" fullWidth disabled={saving || input.overall === 0}>
          {saving ? 'Saving…' : 'Save rating'}
        </Button>
      </form>
    </div>
  );
}
