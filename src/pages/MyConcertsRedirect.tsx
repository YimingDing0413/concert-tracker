import type { ProfileContentTab } from '@/components/profile/ProfileContentTabs';
import { Navigate, useSearchParams } from 'react-router-dom';

/** Legacy /my-concerts URLs → profile tabs */
function mapLegacyTab(tab: string | null): ProfileContentTab | null {
  switch (tab) {
    case 'attended':
      return 'concerts';
    case 'going':
      return 'going';
    case 'reviewed':
      return 'reviews';
    case 'wrapped':
      return 'wrapped';
    default:
      return null;
  }
}

export function MyConcertsRedirect() {
  const [searchParams] = useSearchParams();
  const mapped = mapLegacyTab(searchParams.get('tab'));
  const target = mapped ? `/profile?tab=${mapped}` : '/profile';
  return <Navigate to={target} replace />;
}
