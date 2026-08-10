const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();
const db = require("../db/query");
const z = require("zod");


const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function AICheckDuplicate(newJob) {
    try {
        const allSavedJobs = await db.getAllJobs();
        if (allSavedJobs.length>0){
            const prompt = `
                You are a job duplicate detector.

                Determine whether NEW_JOB is already present in STORED_JOBS.

                NEW_JOB:
                ${JSON.stringify(newJob, null, 2)}

                STORED_JOBS:
                ${JSON.stringify(allSavedJobs, null, 2)}

                A duplicate means that the NEW_JOB and an existing stored job represent the
                same job posting, even if the data has been slightly changed, reformatted,
                shortened, or rewritten.

                For each stored job, evaluate the following:

                1. COMPANY
                The company must be the same, ignoring minor formatting differences.

                2. LOCATION
                The location must be the same.
                Treat equivalent representations as the same location.
                For example:
                "London, UK" = "London, United Kingdom" = "London, London, United Kingdom".

                If the jobs are genuinely in different locations, they are NOT duplicates.

                3. JOB TITLE
                Titles do not need to be exact.
                Consider the meaning of the title and whether the titles describe the
                same position.

                4. DESCRIPTION
                Compare the meaning and responsibilities of the descriptions.
                Rewording, shortening, formatting changes, and minor omissions are expected.

                5. REQUIREMENTS
                Compare the requirements semantically.
                Minor differences do not prevent a duplicate.

                6. SALARY
                Salary is supporting information only and does not need to match.

                A job is a DUPLICATE when there is strong evidence that it is the same
                posting. In particular, an exact or near-exact match on COMPANY + LOCATION
                combined with a strongly matching JOB TITLE, DESCRIPTION, or REQUIREMENTS
                should be considered a duplicate.

                IMPORTANT:
                Do NOT require every field to match.
                Do NOT require descriptions to be identical.
                Do NOT reject a duplicate because salary is missing or different.
                Do NOT reject a duplicate because the title has additional information
                such as a city, year, team name, or parenthetical text.

                For example, these should be considered the same job:

                Stored:
                "2027 Data & Research Strategy Intern (Content Solutions Intern)"

                New:
                "2027 Data & Research Strategy Intern, London (2027 Content Solutions Intern - London)"

                because they clearly describe the same position.

                After comparing NEW_JOB against ALL STORED_JOBS, return true if ANY stored
                job is a duplicate. Otherwise return false.

                Return ONLY true or false.
                `;
            const interaction = await ai.interactions.create({
                model : "gemini-3.5-flash-lite",
                input: prompt,
                response_format: {
                    type: "text",
                    mime_type: "application/json",
                    schema: {
                        type: "boolean"
                    }
                },
            });

            
            const isDuplicate = JSON.parse(interaction.output_text);
            return isDuplicate;
        }
    } catch (error) {
       console.log(error);
       return false; 
    };
}

async function AIretrieveJobInfo (req, res, website){
    let cleanedMarkdown = "";
    let websiteWork = false;

    try {
        const result = await fetch(`https://r.jina.ai/${website}`, {
            headers: {
                "Accept": "text/event-stream",
            },
        });

        if (result.ok){
            cleanedMarkdown = await result.text();
            websiteWork = cleanedMarkdown.length > 100;
        }
    } catch(err){
       console.error("Jina Fetch Error:", err);
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
                salary: { type: "string", description: "Salary or compensation range listed, or empty string if none provided." },
                location: { type: "string", description: "Job location (e.g. City, Country, Remote)." },
                website_work: { type: "boolean", description: "If job details were successfully retrieved then set to true, other wise set to false."}
            },
            required: [
                "job_title",
                "company_name",
                "description",
                "requirements",
                "salary",
                "location",
                "website_work"
                ],
        };

        const jobSchema = z.fromJSONSchema(jobJsonSchema);

        const prompt = `Extract complete job details from the following webpage markdown content:\n\nURL: ${website}\n\nContent:\n${cleanedMarkdown}`

        try{
            const interaction = await ai.interactions.create({
                model : "gemini-3.5-flash-lite",
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

        let isDuplicate = false;
        if (!req.body.forceAdd) {
            isDuplicate = await AICheckDuplicate(newJob);
        }
        if (isDuplicate) {
            return res.json({ duplicate: true });
        }

        const row = await db.InsertNewJob(newJob);
        return res.json({ success: true, redirect: `/dashboard/${row.job_id}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Unable to add new job." });
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