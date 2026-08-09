const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();
const db = require("../db/query");
const z = require("zod");


const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function AIretrieveJobInfo (website){
    const jobJsonSchema = {
        type: "object",
        properties:{
            job_title:{ type: "string", description: "The job's title" },
            company_name: { type: "string", description: "The name of the Company the job is for." },
            description: { type: "string", description: "the description of the job within the website" },
            requirements: { type: "string", description: "the requirements of the job the employer is asking for" },
            salary: { type: "string", description: "the salary they have listed for the job" },
            location: { type: "string", description: "The location where the job is located" },
            website: { type: "string", description: "The exact website that was sent is returned back" },
            website_work: { type: "boolean", description: "true if the website was able to be loaded by the gemini api, and false otherwise." },
        }
    };

    const jobSchema = z.fromJSONSchema(jobJsonSchema);

    const prompt = `This is a link to a website that a user as entered and this input is intended to be for a job: 
    ${website}. Use the provided URL as the primary source and extract the following information for me: The job's title, the company, 
    the description of the job, the requirements the company is asking for the job, the salary, and the location 
    the job will be at. I want this returned in a JSON format. If you are unable to find anything for any of the 
    information then return an empty string for its attribute. The format will be the following {job_title: "the job's
    title", company_name: "the company name", description: "the description of the job within the website", requirements: 
    "the requirements of the job the employer is asking for", salary: "the salary they have listed for the job", location: 
    "the location the job is in", website_work: " boolean true if website worked, false if it did not"} If the website link does not work 
    or is faulty set website_work to boolean false and set all the other attributes to an empty string and still return the JSON.`

    try{
        const interaction = await ai.interactions.create({
            model : "gemini-3.6-flash",
            input: prompt,
            tools: [{ type: "google_search" }],
            response_format: {
                type: "text",
                mime_type: "application/json",
                schema: jobJsonSchema
            },
        });

        const newJob = jobSchema.parse(JSON.parse(interaction.output_text));
        return newJob;
    } catch (error) {
        console.error(error);
        throw new Error("Unable to retrieve job details from the website.");
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
        const result = await AIretrieveJobInfo(req.body.website);
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