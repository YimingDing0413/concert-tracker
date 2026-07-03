import { AppShell } from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { AddConcertPage } from '@/pages/AddConcertPage';
import { ArtistLayout } from '@/components/artist/ArtistLayout';
import { ArtistPastPage } from '@/pages/artist/ArtistPastPage';
import { ArtistSetlistsPage } from '@/pages/artist/ArtistSetlistsPage';
import { ArtistUpcomingPage } from '@/pages/artist/ArtistUpcomingPage';
import { ConcertDetailPage } from '@/pages/ConcertDetailPage';
import { CreatePostPage } from '@/pages/create/CreatePostPage';
import { CreateReviewPage } from '@/pages/create/CreateReviewPage';
import { CreateWantPage } from '@/pages/create/CreateWantPage';
import { CreatePage } from '@/pages/CreatePage';
import { DiscoverHomePage } from '@/pages/DiscoverHomePage';
import { DiscoverMapPage } from '@/pages/DiscoverMapPage';
import { SpotifyRecommendationsPage } from '@/pages/SpotifyRecommendationsPage';
import { FeedPage } from '@/pages/FeedPage';
import { MessageChatView } from '@/pages/MessageChatView';
import { MessagesChatPlaceholder, MessagesLayout } from '@/pages/MessagesLayout';
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
        <Route path="discover/spotify" element={<SpotifyRecommendationsPage />} />
        <Route path="feed" element={<FeedPage />} />
        <Route path="messages" element={<MessagesLayout />}>
          <Route index element={<MessagesChatPlaceholder />} />
          <Route path=":threadId" element={<MessageChatView />} />
        </Route>
        <Route path="create" element={<CreatePage />} />
        <Route path="create/want" element={<CreateWantPage />} />
        <Route path="create/review" element={<CreateReviewPage />} />
        <Route path="create/post" element={<CreatePostPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="my-concerts" element={<MyConcertsRedirect />} />
        <Route path="wrap-up" element={<YearEndWrapUpPage />} />
        <Route path="add" element={<AddConcertPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="member/:userId" element={<MemberProfilePage />} />
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
        path="/concert/:id/review"
        element={
          <ProtectedRoute>
            <ReviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/concert/:id/wrap-up"
        element={
          <ProtectedRoute>
            <WrapUpPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/concert/:id/rate"
        element={<Navigate to="review" replace relative="path" />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
