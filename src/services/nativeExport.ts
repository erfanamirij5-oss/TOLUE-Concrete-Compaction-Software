import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';

export type ExportKind = 'html' | 'csv' | 'json' | 'png';

const filters: Record<ExportKind, { name: string; extensions: string[] }[]> = {
  html: [{ name: 'گزارش مهندسی HTML', extensions: ['html'] }],
  csv: [{ name: 'داده CSV', extensions: ['csv'] }],
  json: [{ name: 'بسته تحلیل JSON', extensions: ['json'] }],
  png: [{ name: 'تصویر PNG', extensions: ['png'] }],
};

function browserDownload(name: string, data: string | Uint8Array, mime: string) {
  const blob = new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function saveTextNative(defaultName: string, text: string, kind: Exclude<ExportKind, 'png'>) {
  try {
    const path = await save({ defaultPath: defaultName, filters: filters[kind] });
    if (!path) return false;
    await writeTextFile(path, text);
    return true;
  } catch (error) {
    console.error('Native text export failed; using browser fallback.', error);
    browserDownload(defaultName, text, kind === 'html' ? 'text/html;charset=utf-8' : kind === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8');
    return true;
  }
}

export async function saveBytesNative(defaultName: string, bytes: Uint8Array, kind: 'png') {
  try {
    const path = await save({ defaultPath: defaultName, filters: filters[kind] });
    if (!path) return false;
    await writeFile(path, bytes);
    return true;
  } catch (error) {
    console.error('Native binary export failed; using browser fallback.', error);
    browserDownload(defaultName, bytes, 'image/png');
    return true;
  }
}

export function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
