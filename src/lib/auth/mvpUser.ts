/**
 * MVP local user helper.
 *
 * Real auth is out of scope: this provides a stable per-browser user id and a
 * local profile cache so the social features have a "current user" to attach
 * usernames and follows to. If a logged-in `encore_user` exists we reuse its
 * id, so social data ties to the same account as reviews/concerts.
 *
 * When real auth (e.g. Google) is added, replace getOrCreateMvpUserId() with
 * the authenticated user id and drop the encore_mvp_* fallbacks.
 */

const MVP_USER_ID_KEY = 'encore_mvp_user_id';
const MVP_PROFILE_KEY = 'encore_mvp_profile';
const AUTH_USER_KEY = 'encore_user';

export interface MvpUserProfile {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

function readAuthUserId(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string };
    return parsed?.id ?? null;
  } catch {
    return null;
  }
}

function generateUserId(): string {
  return `mvp-${crypto.randomUUID().slice(0, 12)}`;
}

/** Stable current-user id: the logged-in user if present, else a local MVP id. */
export function getOrCreateMvpUserId(): string {
  const authId = readAuthUserId();
  if (authId) return authId;

  let id = '';
  try {
    id = localStorage.getItem(MVP_USER_ID_KEY) ?? '';
  } catch {
    /* storage unavailable */
  }
  if (!id) {
    id = generateUserId();
    try {
      localStorage.setItem(MVP_USER_ID_KEY, id);
    } catch {
      /* ignore */
    }
  }
  return id;
}

export function getMvpUserProfile(): MvpUserProfile {
  const userId = getOrCreateMvpUserId();
  try {
    const raw = localStorage.getItem(MVP_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MvpUserProfile;
      if (parsed && parsed.userId === userId) return parsed;
    }
  } catch {
    /* fall through to a fresh profile */
  }

  const now = new Date().toISOString();
  const fresh: MvpUserProfile = {
    userId,
    displayName: 'Guest Fan',
    username: '',
    createdAt: now,
    updatedAt: now,
  };
  saveMvpUserProfile(fresh);
  return fresh;
}

export function saveMvpUserProfile(profile: Partial<MvpUserProfile>): MvpUserProfile {
  const current = (() => {
    try {
      const raw = localStorage.getItem(MVP_PROFILE_KEY);
      return raw ? (JSON.parse(raw) as MvpUserProfile) : null;
    } catch {
      return null;
    }
  })();

  const userId = getOrCreateMvpUserId();
  const now = new Date().toISOString();
  const merged: MvpUserProfile = {
    userId,
    displayName: profile.displayName ?? current?.displayName ?? 'Guest Fan',
    username: profile.username ?? current?.username ?? '',
    avatarUrl: profile.avatarUrl ?? current?.avatarUrl,
    bio: profile.bio ?? current?.bio,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };
  try {
    localStorage.setItem(MVP_PROFILE_KEY, JSON.stringify(merged));
  } catch {
    /* ignore */
  }
  return merged;
}

export function getMvpUserDisplayName(): string {
  return getMvpUserProfile().displayName || 'Guest Fan';
}

export function clearMvpUser(): void {
  try {
    localStorage.removeItem(MVP_USER_ID_KEY);
    localStorage.removeItem(MVP_PROFILE_KEY);
  } catch {
    /* ignore */
  }
}
