import { AppShell } from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { ArtistLayout } from '@/components/artist/ArtistLayout';
import { ArtistPastPage } from '@/pages/artist/ArtistPastPage';
import { ArtistSetlistsPage } from '@/pages/artist/ArtistSetlistsPage';
import { ArtistUpcomingPage } from '@/pages/artist/ArtistUpcomingPage';
import { ConcertDetailPage } from '@/pages/ConcertDetailPage';
import { DiscoverHomePage } from '@/pages/DiscoverHomePage';
import { DiscoverMapPage } from '@/pages/DiscoverMapPage';
import { HomePage } from '@/pages/HomePage';
import { SpotifyRecommendationsPage } from '@/pages/SpotifyRecommendationsPage';
import { LogConcertPage } from '@/pages/LogConcertPage';
import { LoginPage } from '@/pages/LoginPage';
import { MemberProfilePage } from '@/pages/MemberProfilePage';
import { MyConcertsRedirect } from '@/pages/MyConcertsRedirect';
import { ProfilePage } from '@/pages/ProfilePage';
import { ReviewPage } from '@/pages/ReviewPage';
import { SearchPage } from '@/pages/SearchPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { VenueDetailPage } from '@/pages/VenueDetailPage';
import { WrapUpPage } from '@/pages/WrapUpPage';
import { YearEndWrapUpPage } from '@/pages/YearEndWrapUpPage';
import { FEATURES } from '@/config/features';
import { loginPathWithNext, sanitizeNextPath } from '@/lib/auth/nextPath';
import type { ReactNode } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useSearchParams,
} from 'react-router-dom';

/** `/profile?tab=wrapped` → `/wrapped` */
function ProfileWrappedRedirect({ children }: { children: ReactNode }) {
  const [params] = useSearchParams();
  if (params.get('tab') === 'wrapped') {
    return <Navigate to="/wrapped" replace />;
  }
  return <>{children}</>;
}

/** Auth required — preserves intended destination in `?next=`. */
function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner />;
  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={loginPathWithNext(next)} replace />;
  }
  return <Outlet />;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  if (loading) return <LoadingSpinner />;
  if (user) {
    const next = sanitizeNextPath(params.get('next'), '/');
    return <Navigate to={next} replace />;
  }
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <SignUpPage />
          </PublicOnlyRoute>
        }
      />

      {/* Public shell: browse without an account */}
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="discover" element={<DiscoverHomePage />} />
        <Route path="map" element={<DiscoverMapPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="feed" element={<Navigate to="/" replace />} />
        <Route path="messages" element={<Navigate to="/" replace />} />
        <Route path="messages/:threadId" element={<Navigate to="/" replace />} />
        <Route path="wrap-up" element={<Navigate to="/wrapped" replace />} />
        <Route path="my-concerts" element={<MyConcertsRedirect />} />

        {/* Auth-only shell routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="log" element={<LogConcertPage />} />
          <Route path="create" element={<Navigate to="/log" replace />} />
          <Route path="create/want" element={<Navigate to="/log" replace />} />
          <Route path="create/post" element={<Navigate to="/log" replace />} />
          <Route path="create/review" element={<Navigate to="/log" replace />} />
          <Route path="add" element={<Navigate to="/log?manual=1" replace />} />
          <Route path="wrapped" element={<YearEndWrapUpPage />} />
          <Route
            path="discover/spotify"
            element={
              FEATURES.spotify ? (
                <SpotifyRecommendationsPage />
              ) : (
                <Navigate to="/discover" replace />
              )
            }
          />
          <Route
            path="profile"
            element={
              <ProfileWrappedRedirect>
                <ProfilePage />
              </ProfileWrappedRedirect>
            }
          />
          <Route
            path="member/:userId"
            element={
              FEATURES.social ? <MemberProfilePage /> : <Navigate to="/profile" replace />
            }
          />
        </Route>
      </Route>

      {/* Public detail pages (full-bleed, no shell chrome) */}
      <Route path="/artist/:id" element={<ArtistLayout />}>
        <Route index element={<Navigate to="upcoming" replace />} />
        <Route path="upcoming" element={<ArtistUpcomingPage />} />
        <Route path="past" element={<ArtistPastPage />} />
        <Route path="setlists" element={<ArtistSetlistsPage />} />
      </Route>
      <Route path="/venue/:id" element={<VenueDetailPage />} />
      <Route path="/concert/:id" element={<ConcertDetailPage />} />

      {/* Auth-only concert flows */}
      <Route element={<ProtectedRoute />}>
        <Route path="/concert/:id/review" element={<ReviewPage />} />
        <Route path="/concert/:id/wrap-up" element={<WrapUpPage />} />
      </Route>
      <Route path="/concert/:id/rate" element={<Navigate to="review" replace relative="path" />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
