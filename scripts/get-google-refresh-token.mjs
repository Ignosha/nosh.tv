// Run on your own computer: GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... npm run google-token
// Opens a Google sign-in for the calendar owner and prints the refresh token to put in GOOGLE_REFRESH_TOKEN.
import http from "node:http";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first (OAuth client of type 'Desktop app').");
  process.exit(1);
}

const PORT = 53682;
const redirectUri = `http://127.0.0.1:${PORT}`;
const scopes = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  const code = url.searchParams.get("code");
  if (!code) {
    res.end(`No code received: ${url.searchParams.get("error") ?? "unknown error"}`);
    return;
  }
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const json = await tokenRes.json();
  if (!json.refresh_token) {
    res.end("No refresh token returned; see terminal.");
    console.error(json);
  } else {
    res.end("Done. You can close this tab and return to the terminal.");
    console.log(`\nGOOGLE_REFRESH_TOKEN=${json.refresh_token}\n`);
  }
  server.close();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Open this URL and sign in with the Google account whose calendar takes bookings:\n");
  console.log(authUrl + "\n");
});
