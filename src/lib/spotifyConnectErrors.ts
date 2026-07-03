/** User-facing messages for Spotify OAuth failures (client-safe). */
export function spotifyConnectErrorMessage(reason: string): string {
  const decoded = decodeURIComponent(reason).trim();

  if (decoded === 'access_denied') {
    return 'Spotify denied access. If this app is still in Development Mode, ask the app owner to add your Spotify email under Users and Access in the Spotify Developer Dashboard, then try again.';
  }

  if (decoded === 'not_configured') {
    return 'Spotify is not configured on this server yet. Try again later.';
  }

  if (/invalid or expired spotify oauth state/i.test(decoded)) {
    return 'Your connect session expired. Go back to Profile and tap Connect Spotify again.';
  }

  if (/redirect_uri/i.test(decoded)) {
    return 'Spotify redirect settings are misconfigured on the server. The app owner needs to fix SPOTIFY_REDIRECT_URI in Vercel and the Spotify Developer Dashboard.';
  }

  if (/token exchange failed/i.test(decoded)) {
    return 'Spotify authorization failed after redirect. Try Connect Spotify again. If it keeps failing, the app owner should verify Spotify client ID, secret, and redirect URI.';
  }

  return decoded.length > 240 ? `${decoded.slice(0, 240)}…` : decoded;
}
