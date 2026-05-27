import { api } from '@/api';
import { ConcertCard } from '@/components/concert/ConcertCard';
import { Button } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StarRating } from '@/components/ui/StarRating';
import { useAuth } from '@/context/AuthContext';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { averageRating } from '@/utils/format';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [userConcerts, setUserConcerts] = useState<UserConcert[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [ratings, setRatings] = useState<ConcertRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([api.getUserConcerts(user.id), api.getConcerts()])
      .then(async ([ucs, all]) => {
        setUserConcerts(ucs);
        setConcerts(all);
        const rs = await Promise.all(
          ucs.map((uc) => api.getRating(user.id, uc.concertId))
        );
        setRatings(rs.filter((r): r is ConcertRating => r !== null));
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;
  if (loading) return <LoadingSpinner />;

  const attended = userConcerts.filter((uc) => uc.status === 'attended');
  const going = userConcerts.filter((uc) => uc.status === 'going');
  const avg = averageRating(ratings.map((r) => r.overall));

  function resolveConcert(uc: UserConcert) {
    if (uc.isManual && uc.manualConcert) return uc.manualConcert as Partial<Concert>;
    return concerts.find((c) => c.id === uc.concertId);
  }

  return (
    <div className="page profile-page">
      <div className="profile-header card">
        {user.avatarUrl && (
          <img src={user.avatarUrl} alt="" className="profile-avatar" />
        )}
        <div>
          <h1>{user.displayName}</h1>
          <p className="muted">@{user.username}</p>
          {user.bio && <p>{user.bio}</p>}
        </div>
      </div>
      <div className="stats-row">
        <div className="stat">
          <span className="stat-num">{attended.length}</span>
          <span className="stat-lbl">Attended</span>
        </div>
        <div className="stat">
          <span className="stat-num">{going.length}</span>
          <span className="stat-lbl">Going</span>
        </div>
        <div className="stat">
          <span className="stat-num">{avg ?? '—'}</span>
          <span className="stat-lbl">Avg rating</span>
        </div>
      </div>
      <div className="profile-actions">
        <Link to="/add" className="btn btn-primary">
          Add concert manually
        </Link>
        <Button variant="ghost" onClick={() => logout()}>
          Log out
        </Button>
      </div>
      <section>
        <h2>Attended</h2>
        {attended.length === 0 ? (
          <EmptyState title="No attended shows yet" />
        ) : (
          <div className="card-list">
            {attended.map((uc) => {
              const c = resolveConcert(uc);
              const r = ratings.find((x) => x.concertId === uc.concertId);
              return c ? (
                <ConcertCard key={uc.id} concert={c} userConcert={uc} rating={r} concertId={uc.concertId} />
              ) : null;
            })}
          </div>
        )}
      </section>
      <section>
        <h2>Going</h2>
        {going.length === 0 ? (
          <p className="muted">Nothing on the calendar yet.</p>
        ) : (
          <div className="card-list">
            {going.map((uc) => {
              const c = resolveConcert(uc);
              return c ? <ConcertCard key={uc.id} concert={c} userConcert={uc} concertId={uc.concertId} /> : null;
            })}
          </div>
        )}
      </section>
      <section>
        <h2>Reviews</h2>
        {ratings.length === 0 ? (
          <p className="muted">Rate a show after you attend.</p>
        ) : (
          <ul className="review-list">
            {ratings.map((r) => {
              const c = concerts.find((x) => x.id === r.concertId);
              return (
                <li key={r.id} className="card review-item">
                  <Link to={`/concert/${r.concertId}`}>
                    <strong>{c?.artistName ?? 'Concert'}</strong>
                  </Link>
                  <StarRating value={r.overall} readonly size="sm" />
                  {r.review && <p>{r.review}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
