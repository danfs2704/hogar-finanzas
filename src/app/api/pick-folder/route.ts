import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = body.title || 'Elegir ubicacion';

    const platform = process.platform;
    let selectedPath: string | null = null;

    if (platform === 'win32') {
      selectedPath = pickFolderWindows(title);
    } else if (platform === 'darwin') {
      selectedPath = pickFolderMac(title);
    } else {
      selectedPath = pickFolderLinux(title);
    }

    if (selectedPath) {
      return NextResponse.json({ path: selectedPath });
    } else {
      return NextResponse.json({ path: null });
    }
  } catch (err: any) {
    console.error('[pick-folder] Error:', err);
    return NextResponse.json({ error: err.message || 'Error al abrir selector' }, { status: 500 });
  }
}

function pickFolderWindows(title: string): string | null {
  const vbsPath = path.join(os.tmpdir(), 'hf_pick_folder.vbs');
  const vbsContent = `
Set objShell = CreateObject("Shell.Application")
Set objFolder = objShell.BrowseForFolder(0, "${title.replace(/"/g, '')}", 0)
If Not objFolder Is Nothing Then
  WScript.Stdout.WriteLine objFolder.Self.Path
End If
`;
  fs.writeFileSync(vbsPath, vbsContent, 'utf-8');

  try {
    const result = execSync(`cscript //nologo "${vbsPath}"`, {
      encoding: 'utf-8',
      timeout: 120000,
      windowsHide: true,
    }).trim();
    return result || null;
  } catch {
    return null;
  } finally {
    try { fs.unlinkSync(vbsPath); } catch {}
  }
}

function pickFolderMac(title: string): string | null {
  try {
    const result = execSync(
      `osascript -e 'POSIX path of (choose folder with prompt "${title.replace(/"/g, '\\"')}")'`,
      { encoding: 'utf-8', timeout: 120000 }
    ).trim();
    return result || null;
  } catch {
    return null;
  }
}

function pickFolderLinux(title: string): string | null {
  try {
    const result = execSync(
      `zenity --file-selection --directory --title="${title.replace(/"/g, '')}" 2>/dev/null`,
      { encoding: 'utf-8', timeout: 120000 }
    ).trim();
    return result || null;
  } catch {
    return null;
  }
}
