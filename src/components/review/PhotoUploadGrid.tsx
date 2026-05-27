import { Button } from '@/components/ui/app-button';
import { ImagePlus, X } from 'lucide-react';
import { useRef } from 'react';

const MAX_PHOTOS = 4;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

interface PhotoUploadGridProps {
  photos: string[];
  onChange: (photos: string[]) => void;
}

export function PhotoUploadGrid({ photos, onChange }: PhotoUploadGridProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function removeAt(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    const toRead = Array.from(files).slice(0, remaining);

    toRead.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > MAX_FILE_BYTES) return;

      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        onChange([...photos, url].slice(0, MAX_PHOTOS));
      };
      reader.readAsDataURL(file);
    });
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
    e.target.value = '';
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Add up to {MAX_PHOTOS} photos from the night (2MB max each).
      </p>
      <div className="grid grid-cols-2 gap-3">
        {photos.map((url, i) => (
          <div key={`${url.slice(0, 32)}-${i}`} className="relative aspect-[4/5] overflow-hidden rounded-2xl">
            <img src={url} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm"
              aria-label="Remove photo"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/70 bg-card/40 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <ImagePlus className="size-8" />
            <span className="text-xs font-medium">Add photo</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onInputChange}
      />
      {photos.length === 0 && (
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
          Choose photos
        </Button>
      )}
    </div>
  );
}
