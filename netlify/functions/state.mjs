// Shared card slate (Courses + Life Admin), stored in Netlify Blobs so every
// device sees the same thing. GET is public read; POST requires a valid
// Google refresh token for this site's OAuth client (i.e. a browser that has
// connected Google), then last-write-wins on the whole slate.

import { getStore } from '@netlify/blobs';

export default async (req) => {
  const store = getStore('dashboard');

  if (req.method === 'GET') {
    const data = await store.get('projects', { type: 'json' });
    return Response.json(data || { projects: null });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.projects) || !(body.refresh_token || body.write_key)) {
      return Response.json({ error: 'Bad request' }, { status: 400 });
    }
    if (JSON.stringify(body.projects).length > 100000) {
      return Response.json({ error: 'Slate too large' }, { status: 413 });
    }

    // Two ways to authorize a write: a browser that has connected Google
    // (Angus), or the family write key (set STATE_WRITE_KEY in Netlify env).
    const keyOk = !!process.env.STATE_WRITE_KEY && body.write_key === process.env.STATE_WRITE_KEY;
    if (!keyOk) {
      if (!body.refresh_token) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: body.refresh_token,
          grant_type: 'refresh_token',
        }),
      });
      const tok = await r.json();
      if (!tok.access_token) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    await store.setJSON('projects', {
      projects: body.projects,
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};

export const config = { path: '/api/state' };
