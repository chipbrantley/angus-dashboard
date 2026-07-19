// Returns the next 30 days of primary-calendar events, plus "deadlines":
// any upcoming event whose description contains #dashboard.

const { getAccessToken, json } = require('./lib/google');

exports.handler = async (event) => {
  const refreshToken = event.queryStringParameters && event.queryStringParameters.refresh_token;
  if (!refreshToken) return json(401, { error: 'Missing refresh_token' });

  try {
    const accessToken = await getAccessToken(refreshToken);

    const now = new Date();
    const timeMin = new Date(now.getTime() - 12 * 3600 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 30 * 86400 * 1000).toISOString();

    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', timeMin);
    url.searchParams.set('timeMax', timeMax);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '250');

    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`Calendar API ${res.status}`);
    const data = await res.json();
    const items = data.items || [];

    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const deadlines = items
      .filter((e) => (e.description || '').toLowerCase().includes('#dashboard'))
      .map((e) => ({
        date: ((e.start && (e.start.date || e.start.dateTime)) || '').slice(0, 10),
        summary: e.summary || '(no title)',
      }))
      .filter((d) => d.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));

    return json(200, { deadlines, primary: items });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
