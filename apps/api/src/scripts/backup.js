// JSON backup of every collection → backups/<timestamp>/*.json  (portable, no mongodump needed)
// Usage: npm run backup            Restore: npm run restore -- backups/<timestamp>
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
const { EJSON } = mongoose.mongo.BSON;

await mongoose.connect(env.MONGODB_URI);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = path.resolve(process.cwd(), 'backups', stamp);
await fs.mkdir(dir, { recursive: true });

const collections = await mongoose.connection.db.listCollections().toArray();
for (const { name } of collections) {
  if (name.startsWith('system.')) continue;
  const docs = await mongoose.connection.db.collection(name).find({}).toArray();
  await fs.writeFile(path.join(dir, `${name}.json`), EJSON.stringify(docs, null, 2, { relaxed: false }));
  console.log(`  ${name}: ${docs.length} documents`);
}
console.log(`Backup written to ${dir}\nNote: media files live in Cloudinary (or ./uploads in local mode) — back those up separately.`);
await mongoose.disconnect();
