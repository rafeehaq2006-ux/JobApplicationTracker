const db = require("../db/query");

function getDashboard(req, res){
    res.render("dashboard");
}

function getJobDetails(req, res){
    db.getJob(req.params.id)
    .then((result) => {
        res.render("jobDetails", {job: result[0]});
    })
    .catch((err) => {
        console.log(err);
        res.status(404).render("404");
    });
}

module.exports = {
    getDashboard,
    getJobDetails,
}