// Appends the day's intentions and/or habit log to a Google Doc.
// Optional: requires env var GOOGLE_DOC_ID (the long id in the Doc's URL).
// Without it the function returns 501 and the dashboard just saves locally.

const { getAccessToken, json } = require('./lib/google');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const docId = process.env.GOOGLE_DOC_ID;
  if (!docId) return json(501, { error: 'GOOGLE_DOC_ID not configured' });

  try {
    const body = JSON.parse(event.body || '{}');
    if (!body.refresh_token) return json(401, { error: 'Missing refresh_token' });
    const accessToken = await getAccessToken(body.refresh_token);

    let text = '';
    if (body.notes) {
      text += `\n${body.date} — Intentions\n${body.notes}\n`;
    }
    if (body.habits) {
      const done = Object.keys(body.habits).filter((k) => body.habits[k]);
      text += `\n${body.date} — Habits: ${done.join(', ') || '(none)'}\n`;
    }
    if (!text) return json(400, { error: 'Nothing to save' });

    // Find the end of the document, then insert there.
    const docRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}?fields=body(content(endIndex))`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!docRes.ok) throw new Error(`Docs API ${docRes.status}`);
    const doc = await docRes.json();
    const content = (doc.body && doc.body.content) || [];
    const endIndex = content.length ? content[content.length - 1].endIndex : 1;

    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ insertText: { location: { index: Math.max(1, endIndex - 1) }, text } }],
      }),
    });
    if (!updateRes.ok) throw new Error(`Docs API ${updateRes.status}`);

    return json(200, { ok: true });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
