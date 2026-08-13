const express = require("express");
const app = express();
require("dotenv").config();
const session = require("express-session");
const PORT = process.env.PORT || 3000;
const db = require("./db/query");
const dashboardRoutes = require("./routes/dashboardRoute");
const authRoutes = require("./routes/Authroute");

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

if (!process.env.SESSION_SECRET) {
    console.warn("SESSION_SECRET is not set in .env — using an insecure default. Set one before deploying.");
}

app.use(session({
    secret: process.env.SESSION_SECRET || "dev-only-insecure-secret",
    resave: false,
    saveUninitialized: false,
}));

// Makes gmailConnected available in every EJS view (including nav.ejs)
// without having to pass it manually in each res.render call.
app.use((req, res, next) => {
    res.locals.gmailConnected = !!(req.session && req.session.gmailTokens);
    next();
});

app.get("/", (req, res) => {
    res.redirect("/dashboard");
});

app.use("/", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use((req, res) => {
    res.status(404).render("error", { heading: "Error", errormessage: "Page not found" });
});

app.use((err, req, res, next) => {
    console.error(err);
    const status = err.status || 500;
    res.status(status).render("error", {
        heading: "Error",
        errormessage: err.message || "An unexpected error occurred."
    });
});

app.listen(PORT);