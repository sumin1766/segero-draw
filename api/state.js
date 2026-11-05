// Reconstructed LIVE 3.0 baseline for Codex debugging.
// DO NOT deploy this baseline to production. This version deliberately preserves
// the existing single-Blob state storage, which is suspected of read/write conflicts.
// PUBLIC repository contains synthetic fixture data only.
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import crypto from 'node:crypto';
import { seed } from './_data.js';

const PATH = 'segero-draw/2027-season-v3.json';
const equals = (expected, actual) => {
  if (!expected || !actual || typeof actual !== 'string') return false;
  const a = Buffer.from(expected), b = Buffer.from(actual);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff'
  }
});
const getStage = (state, id) => state.stages.find(s => s.id === id);
const getPerson = (state, id) => {
  for (const stage of state.stages) {
    const person = stage.people.find(p => p.id === id);
    if (person) return { stage, person };
  }
  return null;
};
const range = stage => Array.from(
  { length: stage.ticketEnd - stage.ticketStart + 1 },
  (_, i) => stage.ticketStart + i
);
const validLocation = d => d &&
  Number.isInteger(d.battalion) && d.battalion >= 1 && d.battalion <= 10 &&
  Number.isInteger(d.district) && d.district >= 1 && d.district <= 3;
const resolveLocation = (state, stage, ticket) => {
  const i = ticket - stage.ticketStart;
  if (stage.rule === 'captain') return { battalion: i + 1, district: 3, verified: true };
  if (stage.rule === 'leaders') return { battalion: i % 10 + 1, district: Math.floor(i / 10) + 1, verified: true };
  if (stage.rule === 'pastor') return { battalion: i + 1, district: 0, verified: true };
  if (stage.rule === 'leader4') return { battalion: i + 1, district: 0, verified: false, kind: 'review' };
  return state.slotMap[stage.rule]?.[ticket] || null;
};

async function readState() {
  const result = await get(PATH, { access: 'private', abortSignal: AbortSignal.timeout(7000) });
  if (!result) return { state: structuredClone(seed), etag: null };
  if (result.statusCode !== 200 || !result.stream) throw new Error('Could not read state Blob');
  const state = await new Response(result.stream).json();
  return { state, etag: result.blob.etag };
}

async function handler(request) {
  const key = request.headers.get('x-access-key');
  const isAdmin = equals(process.env.DRAW_ADMIN_KEY, key);
  const isView = equals(process.env.DRAW_VIEW_KEY, key);
  if (!isAdmin && !isView) return json({ error: 'Unauthorized' }, 401);
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json({ error: 'Blob storage is not configured' }, 503);

  let state, etag;
  try {
    ({ state, etag } = await readState());
  } catch (error) {
    console.error('Read state failed:', error);
    return json({ error: 'Storage read timeout or failure' }, 503);
  }

  if (request.method === 'GET') return json({ ...state, access: isAdmin ? 'admin' : 'view' });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!isAdmin) return json({ error: 'Read-only broadcast credential' }, 403);

  try {
    const command = await request.json();
    // This stale revision check is a suspected source of the first-draw/second-draw failure.
    if (command.revision !== state.revision)
      return json({ error: '자동저장 충돌: 최신 상태를 새로 불러와 주세요', revision: state.revision }, 409);

    const now = new Date().toISOString();
    const record = (type, extra = {}) => {
      state.activity.push({ type, at: now, ...extra });
      state.activity = state.activity.slice(-250);
    };
    switch (command.type) {
      case 'assign': {
        const found = getPerson(state, command.id);
        if (!found) throw new Error('Unknown member');
        const { stage, person } = found, ticket = Number(command.ticket);
        if (!Number.isInteger(ticket) || ticket < stage.ticketStart || ticket > stage.ticketEnd)
          throw new Error('Ticket outside configured stage range');
        if (state.results[command.id]) throw new Error('Member already assigned');
        if (Object.values(state.results).some(r => r.stage === stage.id && r.ticket === ticket))
          throw new Error('Ticket already assigned');
        const destination = resolveLocation(state, stage, ticket);
        if (!destination || (!validLocation(destination) && !['leader4', 'pastor'].includes(stage.rule)))
          throw new Error('Ticket destination not verified');
        if (destination.verified === false && !['leader4', 'pastor'].includes(stage.rule))
          throw new Error('Ticket destination requires verification');
        state.results[command.id] = { id: command.id, name: person.name, stage: stage.id, ticket, destination, at: now };
        delete state.holds[command.id];
        state.activeStageId = stage.id;
        record('assign', { id: command.id, ticket });
        break;
      }
      case 'hold': {
        const found = getPerson(state, command.id);
        if (!found || state.results[command.id]) throw new Error('Cannot hold this member');
        state.holds[command.id] = true; record('hold', { id: command.id }); break;
      }
      case 'unhold': {
        if (!getPerson(state, command.id)) throw new Error('Unknown member');
        delete state.holds[command.id]; record('unhold', { id: command.id }); break;
      }
      case 'undo': {
        if (!getPerson(state, command.id)) throw new Error('Unknown member');
        delete state.results[command.id]; delete state.holds[command.id];
        record('undo', { id: command.id }); break;
      }
      case 'stageActive': {
        if (!getStage(state, command.stageId)) throw new Error('Unknown stage');
        state.activeStageId = command.stageId; break;
      }
      case 'stageMove': {
        const i = state.stages.findIndex(s => s.id === command.stageId);
        const j = i + Number(command.delta);
        if (i < 0 || j < 0 || j >= state.stages.length) throw new Error('Invalid stage move');
        [state.stages[i], state.stages[j]] = [state.stages[j], state.stages[i]];
        record('stageMove', { stageId: command.stageId }); break;
      }
      case 'stageRename': {
        const stage = getStage(state, command.stageId), label = String(command.label || '').trim();
        if (!stage || !label || label.length > 45) throw new Error('Invalid stage label');
        stage.label = label; record('stageRename', { stageId: command.stageId }); break;
      }
      case 'personMove': {
        const stage = getStage(state, command.stageId);
        if (!stage) throw new Error('Unknown stage');
        const i = stage.people.findIndex(p => p.id === command.id), j = i + Number(command.delta);
        if (i < 0 || j < 0 || j >= stage.people.length) throw new Error('Invalid member move');
        [stage.people[i], stage.people[j]] = [stage.people[j], stage.people[i]];
        record('personMove', { stageId: stage.id }); break;
      }
      case 'personEdit': {
        const stage = getStage(state, command.stageId);
        if (!stage) throw new Error('Unknown stage');
        const name = String(command.name || '').trim();
        const category = String(command.category || '').trim();
        const role = String(command.role || '').trim();
        if (!name || name.length > 60 || category.length > 60 || role.length > 60)
          throw new Error('Invalid member information');
        if (command.id) {
          const person = stage.people.find(p => p.id === command.id);
          if (!person) throw new Error('Unknown member');
          Object.assign(person, { name, category, role });
          if (state.results[command.id]) state.results[command.id].name = name;
        } else {
          if (stage.people.length >= range(stage).length) throw new Error('Not enough tickets');
          stage.people.push({ id: stage.id + '-' + crypto.randomUUID(), name, category, role });
        }
        record('personEdit', { stageId: stage.id }); break;
      }
      case 'personDelete': {
        const stage = getStage(state, command.stageId);
        if (!stage || !stage.people.some(p => p.id === command.id)) throw new Error('Unknown member');
        if (state.results[command.id]) throw new Error('Cancel existing assignment first');
        stage.people = stage.people.filter(p => p.id !== command.id);
        delete state.holds[command.id];
        record('personDelete', { stageId: stage.id }); break;
      }
      case 'importRoster': {
        const rows = command.rows;
        if (!Array.isArray(rows) || !rows.length || rows.length > 500) throw new Error('Invalid roster');
        const group = new Map();
        for (const row of rows) {
          const id = String(row.stageId || '').trim(), stage = getStage(state, id);
          const name = String(row.name || '').trim(), category = String(row.category || '').trim();
          const role = String(row.role || '').trim();
          if (!stage || !name || name.length > 60 || category.length > 60 || role.length > 60)
            throw new Error('Invalid roster entry');
          if (!group.has(id)) group.set(id, []);
          group.get(id).push({ name, category, role, order: Number(row.order) || 999999 });
        }
        for (const [id, entries] of group) {
          const stage = getStage(state, id);
          if (Object.values(state.results).some(r => r.stage === id)) throw new Error('Cancel stage assignments first');
          if (entries.length > range(stage).length) throw new Error('Insufficient tickets');
          if (new Set(entries.map(e => e.name)).size !== entries.length) throw new Error('Duplicate names in roster');
        }
        for (const [id, entries] of group) {
          const stage = getStage(state, id);
          entries.sort((a, b) => a.order - b.order);
          stage.people = entries.map(e => ({ id: id + '-' + crypto.randomUUID(), name: e.name, category: e.category, role: e.role }));
        }
        state.source = '2027 관리자 업로드 명단'; record('importRoster', { groupCount: group.size }); break;
      }
      case 'ticketRange': {
        const stage = getStage(state, command.stageId);
        const start = Number(command.start), end = Number(command.end);
        if (!stage || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 999 || start > end || end - start > 400)
          throw new Error('Invalid ticket range');
        if (Object.values(state.results).some(r => r.stage === stage.id)) throw new Error('Stage has assignments');
        if (end - start + 1 < stage.people.length) throw new Error('Not enough tickets');
        stage.ticketStart = start; stage.ticketEnd = end;
        record('ticketRange', { stageId: stage.id }); break;
      }
      case 'setMap': {
        const stage = getStage(state, command.stageId), ticket = Number(command.ticket);
        const destination = { battalion: Number(command.battalion), district: Number(command.district), verified: true, sourceName: '관리자 설정' };
        if (!stage || !['elder', 'middle', 'young'].includes(stage.rule) ||
            ticket < stage.ticketStart || ticket > stage.ticketEnd || !validLocation(destination))
          throw new Error('Invalid ticket mapping');
        if (Object.values(state.results).some(r => r.stage === stage.id && r.ticket === ticket))
          throw new Error('Ticket already assigned');
        state.slotMap[stage.rule][ticket] = destination;
        record('setMap', { stageId: stage.id, ticket }); break;
      }
      case 'reset': {
        if (command.confirmText !== '2027 초기화') throw new Error('Invalid reset confirmation');
        await put('segero-draw/backups/2027-' + Date.now() + '.json', JSON.stringify(state),
          { access: 'private', addRandomSuffix: false, abortSignal: AbortSignal.timeout(8000) });
        state.results = {}; state.holds = {}; state.activity = [];
        record('reset'); break;
      }
      case 'year': {
        const year = Number(command.year);
        if (!Number.isInteger(year) || year < 2027 || year > 2100) throw new Error('Invalid year');
        state.year = year; record('year'); break;
      }
      default: throw new Error('Unsupported command');
    }
    state.revision++;
    state.updatedAt = now;
    // Single-object overwrite with ifMatch is known to conflict under repeated writes.
    await put(PATH, JSON.stringify(state), {
      access: 'private', allowOverwrite: Boolean(etag),
      ...(etag ? { ifMatch: etag } : {}),
      abortSignal: AbortSignal.timeout(9000)
    });
    return json({ ...state, access: 'admin' });
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError) return json({ error: '동시 저장 충돌', retry: true }, 409);
    console.error('Action error:', error);
    return json({ error: error.message || 'Server error' }, 400);
  }
}
export { handler as GET, handler as POST };
