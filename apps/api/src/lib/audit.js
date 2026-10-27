import { AuditLog } from '../models/index.js';

export async function audit(req, action, entity, entityId, summary = '') {
  try {
    await AuditLog.create({ action, entity, entityId: String(entityId || ''), summary, ip: req.ip });
  } catch (err) {
    console.error('[audit] failed', err.message);
  }
}
