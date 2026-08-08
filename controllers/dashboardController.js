const db = require("../db/query");

async function getDashboard(req, res){
    const appliedJobs = await db.getAppliedJobs();
    const savedJobs = await db.getSavedJobs();
    const offeredJobs = await db.getOfferedJobs();
    const rejectedJobs = await db.getRejectedJobs();
    const onlineassesJobs = await db.getOnlineAssesJobs();
    const interviewJobs = await db.getInterviewJobs();

    res.render("dashboard", { 
        appliedJobs,
        savedJobs,
        offeredJobs,
        rejectedJobs,
        onlineassesJobs,
        interviewJobs,
        heading: "Job Dashboard"
     });
}

function getJobDetails(req, res){
    db.getJob(req.params.id)
    .then((result) => {
        const salaryfix = result[0].salary.replaceAll("œ", "£")
        res.render("jobDetails", {job: result[0], heading: "Job Details", salary: salaryfix});
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