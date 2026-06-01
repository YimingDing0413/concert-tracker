import { generateWrapUpImage } from '@/lib/generateWrapUpImage';

function fileName(year: number): string {
  return `encore-${year}-concert-wrap-up.png`;
}

export async function generateYearEndWrapUpImage(
  element: HTMLElement,
  year: number
): Promise<void> {
  const dataUrl = await generateWrapUpImage(element);
  const link = document.createElement('a');
  link.download = fileName(year);
  link.href = dataUrl;
  link.click();
}

/** Returns true if the native share sheet handled the image, false otherwise. */
export async function shareYearEndWrapUpImage(
  element: HTMLElement,
  year: number
): Promise<boolean> {
  if (!navigator.share) return false;

  const dataUrl = await generateWrapUpImage(element);
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], fileName(year), { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `My ${year} Concert Wrap-Up`,
      text: `A year of shows, songs, and memories — made on Encore.`,
    });
    return true;
  }

  return false;
}
