import assert from 'node:assert/strict';
import test from 'node:test';
import { sniff } from '../src/lib/storage.js';

test('recognises supported image and PDF signatures', () => {
  assert.equal(sniff(Buffer.from([0xff, 0xd8, 0xff, ...new Array(16).fill(0)]), 'photo.jpeg')?.mime, 'image/jpeg');
  assert.equal(sniff(Buffer.from('%PDF-1.7\nexample document'), 'file.pdf')?.kind, 'document');
});

test('recognises modern and legacy Office documents by signature and extension', () => {
  const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, ...new Array(16).fill(0)]);
  const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, ...new Array(12).fill(0)]);

  assert.equal(sniff(zip, 'brief.docx')?.ext, 'docx');
  assert.equal(sniff(zip, 'budget.xlsx')?.ext, 'xlsx');
  assert.equal(sniff(ole, 'slides.ppt')?.ext, 'ppt');
});

test('allows safe text documents but rejects executable or renamed content', () => {
  assert.equal(sniff(Buffer.from('name,email\nAda,ada@example.test\n'), 'contacts.csv')?.mime, 'text/csv');
  assert.equal(sniff(Buffer.from([0x4d, 0x5a, 0, 0, 1, 2, 3]), 'malware.txt'), null);
  assert.equal(sniff(Buffer.from('not really a document'), 'renamed.docx'), null);
});
