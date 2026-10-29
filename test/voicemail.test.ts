import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Mailbox, VoicemailError, parseCallerId } from '../src/lib/voicemail.js';
import { numbering, tempMailbox } from './helpers.js';


describe('parseCallerId', () => {
  it('parses the Asterisk caller ID formats', () => {
    expect(parseCallerId('"Marco" <0511123>')).toEqual({ name: 'Marco', number: '0511123' });
    expect(parseCallerId('"052065747" <052065747>')).toEqual({ name: '', number: '052065747' });
    expect(parseCallerId('<0511123>')).toEqual({ name: '', number: '0511123' });
    expect(parseCallerId('0511123')).toEqual({ name: '', number: '0511123' });
    expect(parseCallerId('Unknown')).toEqual({ name: 'Unknown', number: '' });
    expect(parseCallerId('')).toEqual({ name: '', number: '' });
  });
});


describe('Mailbox', () => {
  let env: Awaited<ReturnType<typeof tempMailbox>>;
  let mailbox: Mailbox;

  beforeEach(async () => {
    env = await tempMailbox();
    mailbox = new Mailbox(env.mailbox, 300);
  });

  afterEach(async () => {
    await fs.rm(env.root, { recursive: true, force: true });
  });


  it('counts the messages of the folders', async () => {
    expect(await mailbox.folders(['INBOX', 'Old', 'Work'])).toEqual([
      { folder: 'INBOX', count: 2 },
      { folder: 'Old',   count: 12 },
      { folder: 'Work',  count: 0 }
    ]);
  });

  it('lists messages newest first with parsed info', async () => {
    const messages = await mailbox.list('Old');
    expect(messages).toHaveLength(12);
    for (let i = 1; i < messages.length; i++) {
      expect(messages[i - 1].date.getTime()).toBeGreaterThanOrEqual(messages[i].date.getTime());
    }
    const first = (await mailbox.list('Old')).find(msg => msg.file === 'msg0000')!;
    expect(first).toMatchObject({
      id:           '1514921935-00000014',
      folder:       'Old',
      callerName:   '',
      callerNumber: '052065747',
      duration:     40
    });
    expect(first.date.getTime()).toBe(1514921935 * 1000);
  });

  it('deletes a message with all audio files and renumbers gap free', async () => {
    const before = await mailbox.list('Old');
    const victim = before.find(msg => msg.file === 'msg0003')!;
    await mailbox.delete('Old', victim.id);

    const after = await mailbox.list('Old');
    expect(after).toHaveLength(11);
    expect(after.map(msg => msg.id)).not.toContain(victim.id);
    // all other messages still exist
    expect(after.map(msg => msg.id).sort()).toEqual(before.filter(msg => msg !== victim).map(msg => msg.id).sort());
    // gap free numbering for every extension
    const nums = await numbering(path.join(env.mailbox, 'Old'));
    expect(nums.txt).toEqual([...Array(11).keys()]);
    expect(nums.gsm).toEqual([...Array(11).keys()]);
    expect([...nums.wav].sort((a, b) => a - b)).toEqual([...Array(11).keys()]);
    // the lock is released
    await expect(fs.stat(path.join(env.mailbox, 'Old', '.lock'))).rejects.toThrow();
  });

  it('keeps the audio files with their info file when renumbering', async () => {
    const victim = (await mailbox.list('Old')).find(msg => msg.file === 'msg0000')!;
    const moved  = (await mailbox.list('Old')).find(msg => msg.file === 'msg0004')!;
    const audio  = await fs.readFile(path.join(env.mailbox, 'Old', 'msg0004.gsm'));
    await mailbox.delete('Old', victim.id);
    const now = (await mailbox.get('Old', moved.id))!;
    expect(now.file).toBe('msg0003');
    expect(await fs.readFile(path.join(env.mailbox, 'Old', 'msg0003.gsm'))).toEqual(audio);
  });

  it('moves a message from INBOX to Old', async () => {
    const msg = (await mailbox.list('INBOX'))[0];
    const moved = await mailbox.move('INBOX', 'Old', msg.id);

    expect(moved).toMatchObject({ id: msg.id, folder: 'Old', file: 'msg0012' });
    expect(await mailbox.list('INBOX')).toHaveLength(1);
    expect((await mailbox.list('Old')).map(m => m.id)).toContain(msg.id);
    expect((await numbering(path.join(env.mailbox, 'INBOX'))).txt).toEqual([0]);
    expect((await numbering(path.join(env.mailbox, 'Old'))).txt).toEqual([...Array(13).keys()]);
  });

  it('creates a missing destination folder when moving', async () => {
    const msg = (await mailbox.list('INBOX'))[0];
    await mailbox.move('INBOX', 'Work', msg.id);
    expect((await mailbox.list('Work')).map(m => m.id)).toEqual([msg.id]);
  });

  it('throws for unknown messages', async () => {
    await expect(mailbox.delete('Old', 'nope')).rejects.toBeInstanceOf(VoicemailError);
    await expect(mailbox.move('INBOX', 'Old', 'nope')).rejects.toBeInstanceOf(VoicemailError);
  });

  it('respects an Asterisk lock', async () => {
    await fs.writeFile(path.join(env.mailbox, 'Old', '.lock'), '1234');
    const msg = (await mailbox.list('Old'))[0];
    await expect(mailbox.delete('Old', msg.id)).rejects.toThrow(/locked/);
    expect(await mailbox.list('Old')).toHaveLength(12);
  });

  it('removes a stale lock', async () => {
    const lock = path.join(env.mailbox, 'Old', '.lock');
    await fs.writeFile(lock, '1234');
    const old = new Date(Date.now() - 120000);
    await fs.utimes(lock, old, old);
    const msg = (await mailbox.list('Old'))[0];
    await mailbox.delete('Old', msg.id);
    expect(await mailbox.list('Old')).toHaveLength(11);
  });

  it('creates an Asterisk call file for playback via a temp dir', async () => {
    const msg = (await mailbox.list('Old'))[0];
    const tmpDir = path.join(env.root, 'spool', 'tmp');
    const file = await mailbox.originatePlayback(msg, { outgoingDir: env.outgoing, tmpDir, channel: 'Local/86@phones', callerId: '"VM" <99>' });

    expect(path.dirname(file)).toBe(env.outgoing);
    expect(file).toMatch(/\.call$/);
    expect(await fs.readdir(tmpDir)).toEqual([]);
    const content = await fs.readFile(file, 'utf-8');
    expect(content).toContain('Channel: Local/86@phones\n');
    expect(content).toContain('CallerID: "VM" <99>\n');
    expect(content).toContain('Application: Playback\n');
    expect(content).toContain('Data: ' + path.join(env.mailbox, 'Old', msg.file).replace(/\\/g, '/') + '\n');
  });
});
