// Usage: npm run restore -- backups/<timestamp>   (replaces matching collections — be sure!)
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
const { EJSON } = mongoose.mongo.BSON;

const dir = process.argv[2];
if (!dir) {
  console.error('Pass the backup directory: npm run restore -- backups/<timestamp>');
  process.exit(1);
}
await mongoose.connect(env.MONGODB_URI);
for (const file of (await fs.readdir(dir)).filter((f) => f.endsWith('.json'))) {
  const name = path.basename(file, '.json');
  const docs = EJSON.parse(await fs.readFile(path.join(dir, file), 'utf8'));
  const col = mongoose.connection.db.collection(name);
  await col.deleteMany({});
  if (docs.length) await col.insertMany(docs);
  console.log(`  restored ${name}: ${docs.length}`);
}
await mongoose.disconnect();
