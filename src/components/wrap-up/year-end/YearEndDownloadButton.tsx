import { Button } from '@/components/ui/app-button';
import {
  generateYearEndWrapUpImage,
  shareYearEndWrapUpImage,
} from '@/lib/generateYearEndWrapUpImage';
import { Download, Share2 } from 'lucide-react';
import { useState } from 'react';

interface YearEndDownloadButtonProps {
  exportRef: React.RefObject<HTMLDivElement | null>;
  year: number;
}

export function YearEndDownloadButton({ exportRef, year }: YearEndDownloadButtonProps) {
  const [busy, setBusy] = useState(false);
  const canShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  async function handleDownload() {
    if (!exportRef.current) return;
    setBusy(true);
    try {
      await generateYearEndWrapUpImage(exportRef.current, year);
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!exportRef.current) return;
    setBusy(true);
    try {
      const shared = await shareYearEndWrapUpImage(exportRef.current, year);
      if (!shared) await generateYearEndWrapUpImage(exportRef.current, year);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button fullWidth variant={canShare ? 'secondary' : 'primary'} disabled={busy} onClick={handleDownload}>
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
