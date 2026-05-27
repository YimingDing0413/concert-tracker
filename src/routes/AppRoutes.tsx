import { AppShell } from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { AddConcertPage } from '@/pages/AddConcertPage';
import { ArtistLayout } from '@/components/artist/ArtistLayout';
import { ArtistPastPage } from '@/pages/artist/ArtistPastPage';
import { ArtistSetlistsPage } from '@/pages/artist/ArtistSetlistsPage';
import { ArtistUpcomingPage } from '@/pages/artist/ArtistUpcomingPage';
import { ConcertDetailPage } from '@/pages/ConcertDetailPage';
import { DiscoverHomePage } from '@/pages/DiscoverHomePage';
import { DiscoverMapPage } from '@/pages/DiscoverMapPage';
import { LoginPage } from '@/pages/LoginPage';
import { MyConcertsPage } from '@/pages/MyConcertsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RatingPage } from '@/pages/RatingPage';
import { SearchPage } from '@/pages/SearchPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { VenueDetailPage } from '@/pages/VenueDetailPage';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  // Show login/signup immediately — don't block on /api/auth/me (often hangs on Vercel cold start)
  if (!loading && user) return <Navigate to="/" replace />;
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
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DiscoverHomePage />} />
        <Route path="map" element={<DiscoverMapPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="my-concerts" element={<MyConcertsPage />} />
        <Route path="add" element={<AddConcertPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route
        path="/artist/:id"
        element={
          <ProtectedRoute>
            <ArtistLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="upcoming" replace />} />
        <Route path="upcoming" element={<ArtistUpcomingPage />} />
        <Route path="past" element={<ArtistPastPage />} />
        <Route path="setlists" element={<ArtistSetlistsPage />} />
      </Route>
      <Route
        path="/venue/:id"
        element={
          <ProtectedRoute>
            <VenueDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/concert/:id"
        element={
          <ProtectedRoute>
            <ConcertDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/concert/:id/rate"
        element={
          <ProtectedRoute>
            <RatingPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
