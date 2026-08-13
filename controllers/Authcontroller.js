const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
const { web: googleWebConfig } = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

function createOAuthClient() {
    return new google.auth.OAuth2(
        googleWebConfig.client_id,
        googleWebConfig.client_secret,
        googleWebConfig.redirect_uris[0]
    );
}

// GET /auth/google — kicks off the sign-in by sending the browser to
// Google's consent screen. This has to be a real page navigation
// (not fetch), since the user needs to see and interact with it.
function startGoogleAuth(req, res) {
    const oauth2Client = createOAuthClient();
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline", // needed to get a refresh_token back
        scope: SCOPES,
        prompt: "consent",
    });
    res.redirect(authUrl);
}

// GET /oauth2callback — Google redirects here with a one-time code
// after the user grants (or denies) access.
async function handleGoogleCallback(req, res) {
    if (req.query.error) {
        // User clicked "cancel" on the consent screen
        return res.redirect("/dashboard");
    }

    try {
        const oauth2Client = createOAuthClient();
        const { tokens } = await oauth2Client.getToken(req.query.code);

        // Stored in the session for now — swap this for a database
        // row (keyed to a user) once this app supports multiple users.
        req.session.gmailTokens = tokens;
        req.session.gmailSignInTime = new Date().toISOString();

        res.redirect("/dashboard");
    } catch (err) {
        console.error(err);
        res.status(500).render("error", { errormessage: "Unable to sign in with Gmail." });
    }
}

// POST /auth/logout — just clears the stored tokens.
function logoutGoogle(req, res) {
    delete req.session.gmailTokens;
    res.json({ success: true });
}

module.exports = {
    createOAuthClient,
    startGoogleAuth,
    handleGoogleCallback,
    logoutGoogle,
};