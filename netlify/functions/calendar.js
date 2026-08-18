// Returns the next 30 days of events from every calendar the connected
// account has ticked visible in Google Calendar (primary + shared school
// calendar + anything else), plus "deadlines": any upcoming event whose
// description contains #dashboard.

const { getAccessToken, json } = require('./lib/google');

exports.handler = async (event) => {
  const refreshToken = event.queryStringParameters && event.queryStringParameters.refresh_token;
  if (!refreshToken) return json(401, { error: 'Missing refresh_token' });

  try {
    const accessToken = await getAccessToken(refreshToken);
    const headers = { Authorization: `Bearer ${accessToken}` };

    const now = new Date();
    const timeMin = new Date(now.getTime() - 12 * 3600 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 30 * 86400 * 1000).toISOString();

    // Every calendar ticked visible in the Google Calendar UI, minus
    // auto-generated birthday/holiday calendars. Primary always included.
    const listRes = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&maxResults=50',
      { headers }
    );
    if (!listRes.ok) throw new Error(`CalendarList API ${listRes.status}`);
    const listData = await listRes.json();
    const cals = (listData.items || [])
      .filter((c) => (c.primary || c.selected) && !/#contacts@|holiday@group\.v\.calendar/.test(c.id))
      .slice(0, 8);
    if (!cals.length) cals.push({ id: 'primary' });

    const fetches = await Promise.allSettled(
      cals.map((c) => {
        const url = new URL(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.id)}/events`
        );
        url.searchParams.set('timeMin', timeMin);
        url.searchParams.set('timeMax', timeMax);
        url.searchParams.set('singleEvents', 'true');
        url.searchParams.set('orderBy', 'startTime');
        url.searchParams.set('maxResults', '100');
        return fetch(url, { headers }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Calendar ${c.id}: ${r.status}`))));
      })
    );
    const items = fetches
      .filter((f) => f.status === 'fulfilled')
      .flatMap((f) => f.value.items || []);

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
