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

      const tasks = (data.items || [])
        .filter((t) => t.status !== 'completed')
        .sort((a, b) => {
          if (a.due && b.due) return a.due.localeCompare(b.due);
          if (a.due) return -1;
          if (b.due) return 1;
          return (a.position || '').localeCompare(b.position || '');
        })
        .map((t) => ({ id: t.id, title: t.title, due: t.due || null, notes: t.notes || null }));

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
