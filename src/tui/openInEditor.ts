import { spawn } from 'node:child_process';
import { getRepoRoot } from '../lib/db.ts';

export function openInEditor(file: string, startLine: number) {
  const repoRoot = getRepoRoot();
  const absPath = `${repoRoot}/${file}`;
  const editor = process.env.EDITOR || process.env.VISUAL;

  if (editor) {
    const isVi = /\b(vim?|nvim|vi)\b/.test(editor);
    const args = isVi ? [`+${startLine}`, absPath] : [absPath];
    spawn(editor, args, { stdio: 'inherit', shell: true });
  } else {
    const codeProc = spawn('code', ['-g', `${absPath}:${startLine}`], { stdio: 'ignore', shell: true });
    codeProc.on('error', () => {
      spawn('open', [absPath], { stdio: 'ignore', shell: true });
    });
  }
}