// test helpers: temporary copies of the voicemail fixture

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';


export const FIXTURE = path.resolve('test', 'voicemail', 'default', '41');


/**
 * Create a temp dir with a copy of the fixture mailbox. The two newest 'Old'
 * messages (msg0012, msg0013) are moved to 'INBOX' as msg0000 and msg0001.
 */
export async function tempMailbox(): Promise<{ root: string; mailbox: string; outgoing: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phopps-test-'));
  const mailbox = path.join(root, 'voicemail', '41');
  await fs.cp(FIXTURE, mailbox, { recursive: true });
  await fs.mkdir(path.join(mailbox, 'INBOX'), { recursive: true });
  for (const file of await fs.readdir(path.join(mailbox, 'Old'))) {
    const match = /^msg(0012|0013)\.(.+)$/.exec(file);
    if (match) {
      const target = match[1] === '0012' ? 'msg0000.' : 'msg0001.';
      await fs.rename(path.join(mailbox, 'Old', file), path.join(mailbox, 'INBOX', target + match[2]));
    }
  }
  const outgoing = path.join(root, 'spool', 'outgoing');
  await fs.mkdir(outgoing, { recursive: true });
  return { root, mailbox, outgoing };
}


/**
 * Message numbers per extension of a folder, like { txt: [0, 1, 2], gsm: [0, 1, 2] }
 */
export async function numbering(dir: string): Promise<Record<string, number[]>> {
  const result: Record<string, number[]> = {};
  for (const file of (await fs.readdir(dir)).sort()) {
    const match = /^msg(\d{4})\.(.+)$/.exec(file);
    if (match) {
      const ext = match[2].toLowerCase();
      (result[ext] ??= []).push(Number(match[1]));
    }
  }
  return result;
}
