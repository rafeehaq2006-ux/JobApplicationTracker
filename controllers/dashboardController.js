const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();
const db = require("../db/query");
const z = require("zod");


const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function AIretrieveJobInfo (req, res, website){
    let htmlText = "";
    let websiteWork = false;

    try {
        const result = await fetch(website);
    

        const rawHtml = await result.text();
        htmlText = rawHtml
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        websiteWork = htmlText.length >100
    } catch(err){
        websiteWork = false;
    };
    if (!websiteWork) {
        return {
        job_title: "",
        company_name: "",
        description: "",
        requirements: "",
        salary: "",
        location: "",
        website: website,
        website_work: false,
        };
    } else {
        const jobJsonSchema = {
            type: "object",
            properties:{
                job_title:{ type: "string", description: "Official title of the job." },
                company_name: { type: "string", description: "The name of the Company the job is for." },
                description: { type: "string", description: "A comprehensive summary of the job role, responsibilities, and team background. Do not summarize into 1 line; capture full detail." },
                requirements: { type: "string", description: "Detailed list of all required skills, experience, qualifications, and education." },
                salary: { type: "string", description: "Salary or compensation range listed, or empty string if not found." },
                location: { type: "string", description: "Job location (e.g. City, Country, Remote)." },
            }
        };

        const jobSchema = z.fromJSONSchema(jobJsonSchema);

        const prompt = `Extract complete job details from the following webpage content:\n\nURL: ${website}\n\nContent:\n${htmlText}`

        try{
            const interaction = await ai.interactions.create({
                model : "gemini-3.5-flash",
                input: prompt,
                response_format: {
                    type: "text",
                    mime_type: "application/json",
                    schema: jobJsonSchema
                },
            });

            const newJob = jobSchema.parse(JSON.parse(interaction.output_text));
            return {
                ...newJob,
                website:website,
                website_work: true
            };
        } catch (error) {
            console.error(error);
            throw new Error("Unable to retrieve job details from the website.");
        }
    }

}

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
        res.status(500).render("error", { errormessage: "Unable to load dashboard." });
    }
}

function getJobDetails(req, res){
    db.getJob(req.params.id)
    .then((result) => {
        if (!result || result.length === 0) {
            return res.status(404).render("error", { errormessage: "Job not found." });
        }

        const salaryfix = result[0].salary.replaceAll("œ", "£");
        res.render("jobDetails", {job: result[0], heading: "Job Details", salary: salaryfix});
    })
    .catch((err) => {
        console.error(err);
        res.status(500).render("error", { errormessage: "Unable to load job details." });
    });
}

async function addNewJob(req, res){
    try {
        let applied;
        if (req.body.applied === "") {
            req.body.applied = null;
            applied = new Date().toISOString();
        } else {
            applied = new Date(req.body.applied).toISOString();
            req.body.applied = applied;
        }

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
        };

        const row = await db.InsertNewJob(newJob);
        res.redirect(`/dashboard/${row.job_id}`);
    } catch (error) {
        console.error(error);
        res.status(500).render("error", { errormessage: "Unable to add new job." });
    }
}

async function autoJobFill(req, res){
    try {
        const result = await AIretrieveJobInfo(req, res, req.body.website);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).render("error", { errormessage: "Unable to auto-fill job information." });
    }
}

async function editJob(req, res) {
    try {
        const result = await db.getJob(req.params.id);
        if (!result || result.length === 0) {
            return res.status(404).render("error", { errormessage: "Job not found for editing." });
        }

        console.log(result[0]);
        res.json(result[0]);
    } catch (err) {
        console.error(err);
        res.status(500).render("error", { errormessage: "Unable to load job for editing." });
    }
}

async function makeEditChanges(req, res) {
    try {
        if (req.body.applied === "") {
            req.body.applied = null;
        } else {
            req.body.applied = new Date(req.body.applied).toISOString();
        }

        req.body.job_id = req.params.id;

        await db.UpdateJobInfo(req.body);

        res.redirect(`/dashboard/${req.params.id}`);

    } catch (err) {
        console.error(err);
        res.status(500).render("error", { errormessage: "Failed to update job." });
    }
}

async function deleteJob(req, res) {
    try {
        await db.deleteJob(req.params.id);
        res.json({ redirect: "/dashboard" });
    } catch(err){
        console.error(err);
        res.render("error", { errormessage: "Failed to delete job." });
    }
}
module.exports = {
    getDashboard,
    getJobDetails,
    addNewJob,
    autoJobFill,
    editJob,
    makeEditChanges,
    deleteJob
}