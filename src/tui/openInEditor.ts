import { spawn } from 'node:child_process';
import type { CommentEntity } from '../comments/comments.domain.ts';
import { getRepoRoot } from '../lib/db.ts';

export function openInEditor(c: CommentEntity) {
  const repoRoot = getRepoRoot();
  const absPath = `${repoRoot}/${c.file}`;
  const editor = process.env.EDITOR || process.env.VISUAL;

  if (editor) {
    const isVi = /\b(vim?|nvim|vi)\b/.test(editor);
    const args = isVi ? [`+${c.startLine}`, absPath] : [absPath];
    spawn(editor, args, { stdio: 'inherit', shell: true });
  } else {
    const codeProc = spawn('code', ['-g', `${absPath}:${c.startLine}`], { stdio: 'ignore', shell: true });
    codeProc.on('error', () => {
      spawn('open', [absPath], { stdio: 'ignore', shell: true });
    });
  }
}