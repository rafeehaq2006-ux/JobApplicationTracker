const db = require("../db/query");

async function getDashboard(req, res){
    try{
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
    } catch (error) {
        console.error(error);
    }
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

async function addNewJob(req, res){
    if (req.body.applied === "") {
    req.body.applied = new Date().toISOString();
    } else {
        req.body.applied = new Date(req.body.applied).toISOString();
    };

    const newJob ={
        job_title: req.body.job_title,
        company_name: req.body.company_name,
        tracking_status: req.body.tracking_status,
        location: req.body.location,
        salary: req.body.salary,
        website: req.body.website,
        description: req.body.description,
        requirements: req.body.requirements, 
        applied: req.body.applied,
    }

    const row = await db.InsertNewJob(newJob)
    if (req.body.tracking_status === "Applied"){
        db.InsertTrackingInfo(row.job_id,req.body.applied,req.body.tracking_status)
        .then((result) => res.redirect(`/dashboard/${row.job_id}`))
        .catch((err) => console.log(err));
    } else {
        db.InsertTrackingInfo(row.job_id, new Date().toISOString(),req.body.tracking_status)
        .then((result) => res.redirect(`/dashboard/${row.job_id}`))
        .catch((err) => console.log(err));
    };
}

module.exports = {
    getDashboard,
    getJobDetails,
    addNewJob,
}