import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dataUrlToBytes } from './nativeExport';

describe('TOLUE RC runtime/export validation', () => {
  it('keeps desktop export plugins registered in the Tauri runtime', () => {
    const lib = readFileSync(resolve('src-tauri/src/lib.rs'), 'utf8');
    expect(lib).toContain('tauri_plugin_dialog::init()');
    expect(lib).toContain('tauri_plugin_fs::init()');
  });

  it('keeps required desktop capabilities for print, save dialog and file writing', () => {
    const capability = JSON.parse(readFileSync(resolve('src-tauri/capabilities/default.json'), 'utf8')) as {
      windows?: string[];
      permissions?: string[];
    };
    expect(capability.windows).toContain('main');
    expect(capability.permissions).toContain('core:webview:allow-print');
    expect(capability.permissions).toContain('dialog:default');
    expect(capability.permissions).toContain('fs:write-files');
  });

  it('decodes a PNG data URL into its exact byte payload', () => {
    const source = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const dataUrl = `data:image/png;base64,${Buffer.from(source).toString('base64')}`;
    expect(Array.from(dataUrlToBytes(dataUrl))).toEqual(Array.from(source));
  });

  it('keeps native export source wired to dialog, fs and browser fallback paths', () => {
    const source = readFileSync(resolve('src/services/nativeExport.ts'), 'utf8');
    expect(source).toContain("from '@tauri-apps/plugin-dialog'");
    expect(source).toContain("from '@tauri-apps/plugin-fs'");
    expect(source).toContain('browserDownload(');
    expect(source).toContain('writeTextFile(');
    expect(source).toContain('writeFile(');
  });

  it('keeps export center formats and viewport export available', () => {
    const source = readFileSync(resolve('src/services/exportCenter.ts'), 'utf8');
    expect(source).toContain('TOLUE-ENGINEERING-PACKAGE-v4');
    expect(source).toContain('saveEngineeringJson');
    expect(source).toContain('saveProjectCsv');
    expect(source).toContain('saveEngineeringHtml');
    expect(source).toContain('saveViewportPng');
  });
});
