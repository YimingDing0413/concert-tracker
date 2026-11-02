import { toPng } from 'html-to-image';

export async function generateWrapUpImage(element: HTMLElement): Promise<string> {
  try {
    await document.fonts.ready;
  } catch {
    /* fonts API unavailable — continue */
  }

  // Capture at the element's laid-out 1080×1920; pixelRatio keeps edges crisp.
  return toPng(element, {
    width: element.offsetWidth || 1080,
    height: element.offsetHeight || 1920,
    pixelRatio: 2,
    cacheBust: true,
    skipFonts: false,
  });
}

export function slugifyArtist(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export async function downloadWrapUpImage(
  element: HTMLElement,
  artistName: string
): Promise<void> {
  const dataUrl = await generateWrapUpImage(element);
  const link = document.createElement('a');
  link.download = `encore-concert-wrap-up-${slugifyArtist(artistName)}.png`;
  link.href = dataUrl;
  link.click();
}

export async function shareWrapUpImage(
  element: HTMLElement,
  artistName: string
): Promise<boolean> {
  if (!navigator.share) return false;

  const dataUrl = await generateWrapUpImage(element);
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File(
    [blob],
    `encore-concert-wrap-up-${slugifyArtist(artistName)}.png`,
    { type: 'image/png' }
  );

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `${artistName} — Concert Wrap-Up`,
      text: 'My concert recap on Encore',
    });
    return true;
  }

  return false;
}
