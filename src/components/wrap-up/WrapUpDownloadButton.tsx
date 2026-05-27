import { Button } from '@/components/ui/app-button';
import { downloadWrapUpImage, shareWrapUpImage } from '@/lib/generateWrapUpImage';
import { Download, Share2 } from 'lucide-react';
import { useState } from 'react';

interface WrapUpDownloadButtonProps {
  exportRef: React.RefObject<HTMLDivElement | null>;
  artistName: string;
}

export function WrapUpDownloadButton({ exportRef, artistName }: WrapUpDownloadButtonProps) {
  const [busy, setBusy] = useState(false);
  const canShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  async function handleDownload() {
    if (!exportRef.current) return;
    setBusy(true);
    try {
      await downloadWrapUpImage(exportRef.current, artistName);
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!exportRef.current) return;
    setBusy(true);
    try {
      const shared = await shareWrapUpImage(exportRef.current, artistName);
      if (!shared) await downloadWrapUpImage(exportRef.current, artistName);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button fullWidth variant="secondary" disabled={busy} onClick={handleDownload}>
        <Download className="mr-2 size-4" />
        {busy ? 'Generating…' : 'Download PNG'}
      </Button>
      {canShare && (
        <Button fullWidth disabled={busy} onClick={handleShare}>
          <Share2 className="mr-2 size-4" />
          Share
        </Button>
      )}
    </div>
  );
}
