const db = require("../db/query");

async function getDashboard(req, res){
    const appliedJobs = await db.getAppliedJobs();
    const savedJobs = await db.getSavedJobs();
    const offeredJobs = await db.getOfferedJobs();
    const rejectedJobs = await db.getRejectedJobs();
    const onlineassesJobs = await db.getOnlineAssesJobs();
    const interviewJobs = await db.getInterviewJobs();

    console.log(appliedJobs);
    res.render("dashboard", { 
        appliedJobs,
        savedJobs,
        offeredJobs,
        rejectedJobs,
        onlineassesJobs,
        interviewJobs,
     });
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