import { StatusBadge as Badge } from '@/components/ui/status-badge';
import type { Setlist } from '@/types';

interface SetlistDisplayProps {
  setlist?: Setlist;
  title?: string;
}

export function SetlistDisplay({ setlist, title }: SetlistDisplayProps) {
  if (!setlist) {
    return <p className="muted">No setlist available yet.</p>;
  }

  const heading =
    title ?? (setlist.source === 'predicted' ? 'Predicted setlist' : 'Setlist');
  const hasSongs = setlist.songs.length > 0;

  return (
    <section className="setlist-block card">
      <div className="setlist-head">
        <h3>{heading}</h3>
        <Badge type={setlist.source} />
      </div>
      {setlist.source === 'predicted' && setlist.predictionBasis === 'same-tour' && (
        <p className="setlist-hint muted">
          Copied from the latest show on the same tour
          {setlist.tourName ? ` (${setlist.tourName})` : ''}. Actual setlist may vary.
        </p>
      )}
      {setlist.source === 'predicted' && setlist.predictionBasis === 'recent-frequency' && (
        <p className="setlist-hint muted">
          Based on songs played most often on recent shows — actual setlist may vary.
        </p>
      )}
      {setlist.source === 'predicted' && !setlist.predictionBasis && (
        <p className="setlist-hint muted">
          Based on recent shows — actual setlist may vary.
        </p>
      )}
      {hasSongs ? (
        <ol className="setlist">
          {setlist.songs.map((song, index) => (
            <li key={`${index}-${song.name}`} className={song.encore ? 'encore' : ''}>
              {song.name}
              {song.encore && <span className="encore-tag">encore</span>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">Song list unavailable — open Setlist.fm for full details.</p>
      )}
      {setlist.setlistFmUrl && (
        <a href={setlist.setlistFmUrl} target="_blank" rel="noreferrer" className="link-out">
          View on Setlist.fm →
        </a>
      )}
    </section>
  );
}
