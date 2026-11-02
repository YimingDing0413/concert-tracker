import type { ProfileContentTab } from '@/components/profile/ProfileContentTabs';
import { Navigate, useSearchParams } from 'react-router-dom';

/** Legacy /my-concerts URLs → profile tabs (or /wrapped). */
function mapLegacyTab(tab: string | null): ProfileContentTab | 'wrapped-route' | null {
  switch (tab) {
    case 'attended':
      return 'concerts';
    case 'going':
      return 'going';
    case 'saved':
    case 'want':
      return 'want';
    case 'reviewed':
      return 'reviews';
    case 'wrapped':
      return 'wrapped-route';
    default:
      return null;
  }
}

export function MyConcertsRedirect() {
  const [searchParams] = useSearchParams();
  const mapped = mapLegacyTab(searchParams.get('tab'));
  if (mapped === 'wrapped-route') return <Navigate to="/wrapped" replace />;
  const target = mapped ? `/profile?tab=${mapped}` : '/profile';
  return <Navigate to={target} replace />;
}
