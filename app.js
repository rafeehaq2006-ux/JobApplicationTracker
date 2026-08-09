const express = require("express");
const app = express();
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const db = require("./db/query");
const dashboardRoutes = require("./routes/dashboardRoute");

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
    res.redirect("/dashboard");
});

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