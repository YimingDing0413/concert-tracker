import { HttpApiError } from '@/api/http';
import { Button } from '@/components/ui/app-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { saveMyProfile, validateUsernameClient } from '@/lib/social/socialApi';
import type { UserProfile } from '@/types';
import { useEffect, useState } from 'react';

interface UsernameEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentUsername?: string;
  currentDisplayName?: string;
  currentBio?: string;
  onSaved?: (profile: UserProfile) => void;
}

export function UsernameEditor({
  open,
  onOpenChange,
  userId,
  currentUsername,
  currentDisplayName,
  currentBio,
  onSaved,
}: UsernameEditorProps) {
  const [username, setUsername] = useState(currentUsername ?? '');
  const [displayName, setDisplayName] = useState(currentDisplayName ?? '');
  const [bio, setBio] = useState(currentBio ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setUsername(currentUsername ?? '');
      setDisplayName(currentDisplayName ?? '');
      setBio(currentBio ?? '');
      setError('');
    }
  }, [open, currentUsername, currentDisplayName, currentBio]);

  async function handleSave() {
    const check = validateUsernameClient(username);
    if (!check.ok) {
      setError(check.error ?? 'Invalid username.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const profile = await saveMyProfile({
        userId,
        username: username.trim().toLowerCase(),
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      onSaved?.(profile);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof HttpApiError ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>{currentUsername ? 'Edit profile' : 'Create your username'}</DialogTitle>
          <DialogDescription>
            Pick a unique @username so friends can find and follow you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Username</span>
            <div className="flex items-center gap-2 rounded-lg border border-input px-2.5">
              <span className="text-sm text-muted-foreground">@</span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="yourname"
                autoCapitalize="none"
                autoCorrect="off"
                className="border-0 px-0 focus-visible:ring-0"
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              3–30 chars · letters, numbers, _ and . only
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Display name</span>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Bio (optional)</span>
            <Input
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Live music lover"
            />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
