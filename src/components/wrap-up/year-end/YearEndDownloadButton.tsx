import { Button } from '@/components/ui/app-button';
import {
  generateYearEndWrapUpImage,
  shareYearEndWrapUpImage,
} from '@/lib/generateYearEndWrapUpImage';
import { Download, Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface YearEndDownloadButtonProps {
  exportRef: React.RefObject<HTMLDivElement | null>;
  year: number;
}

function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare !== 'function') return true;
  try {
    const probe = new File([new Blob(['x'], { type: 'image/png' })], 'encore.png', {
      type: 'image/png',
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export function YearEndDownloadButton({ exportRef, year }: YearEndDownloadButtonProps) {
  const [busy, setBusy] = useState(false);
  const showShare = useMemo(() => canShareFiles(), []);

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
      <Button
        fullWidth
        variant={showShare ? 'secondary' : 'primary'}
        disabled={busy}
        onClick={() => void handleDownload()}
      >
        <Download className="mr-2 size-4" />
        {busy ? 'Generating…' : 'Download PNG'}
      </Button>
      {showShare && (
        <Button fullWidth disabled={busy} onClick={() => void handleShare()}>
          <Share2 className="mr-2 size-4" />
          Share
        </Button>
      )}
    </div>
  );
}
