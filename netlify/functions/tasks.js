// GET  -> open tasks from the default Google Tasks list, due-date order.
// POST -> mark a task complete ({ refresh_token, task_id }).

const { getAccessToken, json } = require('./lib/google');

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const refreshToken = event.queryStringParameters && event.queryStringParameters.refresh_token;
      if (!refreshToken) return json(401, { error: 'Missing refresh_token' });
      const accessToken = await getAccessToken(refreshToken);

      const res = await fetch(
        'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=false&maxResults=25',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error(`Tasks API ${res.status}`);
      const data = await res.json();

      // Match "My order" in the Google Tasks interface. `position` only orders
      // siblings, so sort top-level tasks and each parent's subtasks separately,
      // then flatten parent-first like the UI shows them.
      const items = (data.items || []).filter((t) => t.status !== 'completed');
      const byPos = (a, b) => (a.position || '').localeCompare(b.position || '');
      const topLevel = items.filter((t) => !t.parent).sort(byPos);
      const children = {};
      items.filter((t) => t.parent).forEach((t) => {
        (children[t.parent] = children[t.parent] || []).push(t);
      });
      Object.values(children).forEach((arr) => arr.sort(byPos));
      const ordered = [];
      topLevel.forEach((t) => {
        ordered.push(t);
        (children[t.id] || []).forEach((k) => ordered.push(k));
      });
      // Subtasks whose parent is completed/hidden would otherwise vanish — append them.
      const seen = new Set(ordered.map((t) => t.id));
      items.filter((t) => !seen.has(t.id)).sort(byPos).forEach((t) => ordered.push(t));
      const tasks = ordered.map((t) => ({ id: t.id, title: t.title, due: t.due || null, notes: t.notes || null }));

      return json(200, { tasks });
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.refresh_token || !body.task_id) return json(400, { error: 'Missing refresh_token or task_id' });
      const accessToken = await getAccessToken(body.refresh_token);

      const res = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${encodeURIComponent(body.task_id)}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        }
      );
      if (!res.ok) throw new Error(`Tasks API ${res.status}`);
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
