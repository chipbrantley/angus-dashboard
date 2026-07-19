// Exchanges the Google OAuth authorization code for a refresh token,
// stashes it in the browser's localStorage, and bounces back to the dashboard.

exports.handler = async (event) => {
  const code = event.queryStringParameters && event.queryStringParameters.code;
  if (!code) {
    return { statusCode: 400, body: 'Missing authorization code.' };
  }

  const redirectUri = `https://${event.headers.host}/auth/callback`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json();

  if (!data.refresh_token) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `<h3>Google didn't return a refresh token.</h3>
<p>${data.error_description || data.error || 'This usually means the app was already authorized. Remove access at <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a> and try again.'}</p>
<p><a href="/">Back to dashboard</a></p>`,
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: `<!doctype html><html><body style="font-family:monospace;padding:40px;">
Connected ✓ Redirecting…
<script>
localStorage.setItem('gcal_refresh_token', ${JSON.stringify(data.refresh_token)});
window.location.href = '/';
</script>
</body></html>`,
  };
};
