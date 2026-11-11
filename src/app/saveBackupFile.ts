export type SaveOutcome = 'saved' | 'cancelled' | 'unconfirmed';

interface SaveFilePickerOptions {
  suggestedName: string;
  types: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}

interface FileSystemWritableFileStream {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface WindowWithSaveFilePicker extends Window {
  showSaveFilePicker?: (
    options: SaveFilePickerOptions,
  ) => Promise<FileSystemFileHandle>;
}

function errorName(error: unknown): string | undefined {
  return typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    typeof error.name === 'string'
    ? error.name
    : undefined;
}

async function saveWithPicker(file: File): Promise<SaveOutcome | undefined> {
  const showSaveFilePicker = (window as WindowWithSaveFilePicker)
    .showSaveFilePicker;
  if (!showSaveFilePicker) {
    return undefined;
  }

  try {
    const handle = await showSaveFilePicker({
      suggestedName: file.name,
      types: [
        {
          description: 'Budget backup',
          accept: { 'application/json': ['.json'] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(file);
    await writable.close();
    return 'saved';
  } catch (error) {
    const name = errorName(error);
    if (name === 'AbortError') {
      return 'cancelled';
    }
    if (name !== 'NotAllowedError' && name !== 'SecurityError') {
      throw error;
    }
    return undefined;
  }
}

async function saveWithShare(file: File): Promise<SaveOutcome | undefined> {
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
    return undefined;
  }

  try {
    await navigator.share({ files: [file], title: file.name });
    return 'saved';
  } catch (error) {
    if (errorName(error) === 'AbortError') {
      return 'cancelled';
    }
    return undefined;
  }
}

function saveWithAnchor(file: File): SaveOutcome {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return 'unconfirmed';
}

export async function saveBackupFile(file: File): Promise<SaveOutcome> {
  const pickerOutcome = await saveWithPicker(file);
  if (pickerOutcome) {
    return pickerOutcome;
  }

  const shareOutcome = await saveWithShare(file);
  if (shareOutcome) {
    return shareOutcome;
  }

  return saveWithAnchor(file);
}
