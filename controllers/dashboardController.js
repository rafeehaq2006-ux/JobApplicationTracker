const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();
const db = require("../db/query");
const z = require("zod");
const { google } = require("googleapis");
const { createOAuthClient } = require("./Authcontroller");
const { describe } = require('zod/v4/core');

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function AICheckEmails(emails) {
    try {
        const allSavedJobs = await db.getAllJobs();

        if (allSavedJobs.length > 0) {
            const prompt = `You are an AI assistant responsible for detecting job application status changes from emails.

                You will be given two JSON arrays:

                1. \`emails\` — an array of email objects. Each email has:
                * \`subject\`
                * \`body\`

                2. \`allSavedJobs\` — an array of jobs saved by the user in their database. Each job has these attributes:
                * \`job_id\` — integer
                * \`job_title\` — text
                * \`company_name\` — text
                * \`description\` — text
                * \`location\` — text
                * \`requirements\` — text
                * \`salary\` — text
                * \`tracking_status\` — current application status
                * \`website\` — text
                * \`applied\` — timestamp

                Your task is to analyze every email and determine whether the email indicates that the application status for one of the jobs in \`allSavedJobs\` has changed.

                ## Allowed tracking statuses

                The \`tracking_status\` in your output MUST be exactly one of these values:

                * "Interviewing"
                * "Saved For Later"
                * "Online Assessment"
                * "Applied"
                * "Rejected"
                * "Offer Received"

                Do not use any other status.

                ## Job matching

                An email must correspond to a job that exists in \`allSavedJobs\`.

                Use the available information in the email and the saved job to determine whether they refer to the same job application. Consider:

                * Company name
                * Job title
                * Employer/recruiter name
                * Job posting URL or website
                * Application URL
                * Location
                * Other identifying information in the email

                Company and job title do not always have to match word-for-word. Account for common variations such as abbreviations, punctuation, capitalization, department names, and minor wording differences.

                However, do NOT associate an email with a saved job if the evidence is ambiguous or there are multiple plausible matching jobs. When uncertain, do not return an update.

                ## Determining whether the status changed

                Only return a job if the email provides credible evidence that the application's status has changed to a different status than the job's CURRENT \`tracking_status\`.

                The email must contain meaningful evidence of an application status or stage.

                Examples:

                * An email saying the application was received/submitted/confirmed can indicate "Applied".
                * An email inviting the candidate to complete an online coding test, assessment, or screening assessment can indicate "Online Assessment".
                * An email inviting the candidate to an interview, phone screen, technical interview, onsite interview, or similar interview stage can indicate "Interviewing".
                * An email explicitly rejecting the application or saying the company will not be moving forward can indicate "Rejected".
                * An email containing a job offer or stating that the candidate has been selected and is being offered the position can indicate "Offer Received".

                Do NOT infer a status change from weak or indirect evidence.

                For example, do not change a status merely because:

                * The company sent a marketing email.
                * The company sent a generic newsletter.
                * The email contains a job recommendation.
                * The company says the application is "under review" without indicating one of the allowed statuses.
                * The email is merely acknowledging receipt when the current status is already "Applied".
                * The email is unrelated to the specific saved job.
                * The email is ambiguous about which job it refers to.

                If an email indicates a status that is the same as the job's current \`tracking_status\`, do NOT return that job.

                ## Important status rules

                Use the most specific status supported by the email.

                For example:

                * "Congratulations, we'd like to offer you the position" → "Offer Received"
                * "We'd like to schedule an interview" → "Interviewing"
                * "Please complete your coding assessment" → "Online Assessment"
                * "Unfortunately, we will not be moving forward" → "Rejected"

                An "Offer Received" status takes precedence over "Interviewing" if the email clearly contains an offer.

                Do not return "Saved For Later" unless the email provides clear evidence that the application/job has specifically been moved into a saved/later consideration state. Do not use "Saved For Later" simply because the application is still being reviewed.

                ## Multiple emails

                Process all emails independently.

                If multiple emails refer to the same saved job:

                * Determine the most credible/current status indicated by the emails.
                * Return at most ONE object for each \`job_id\`.
                * The returned status must represent the newest/latest status change supported by the provided emails.
                * Do not downgrade a job to an earlier status if another email clearly indicates a later stage.

                ## Output requirements

                Your response MUST contain ONLY a valid JSON array.

                Do not include:

                * Markdown
                * Code fences
                * Explanations
                * Reasoning
                * Additional properties
                * Comments
                * Text before or after the JSON

                If there are no qualifying status changes, return:

                []

                Otherwise, return an array containing objects with EXACTLY these two properties:

                [
                    {
                        "job_id": 123,
                        "tracking_status": "Interviewing"
                    }
                ]

                \`job_id\` MUST come directly from a matching job in \`allSavedJobs\`. Never invent a job ID.

                Only return jobs whose tracking status has actually changed based on credible evidence in the emails.

                Here are the emails:

                ${JSON.stringify(emails)}

                Here are the user's saved jobs:

                ${JSON.stringify(allSavedJobs)}
                `;

            const TRACKING_STATUS_OPTIONS = [
                "Interviewing",
                "Saved For Later",
                "Online Assessment",
                "Applied",
                "Rejected",
                "Offer Received",
            ];

            const jobIdOptions = allSavedJobs.map((job) => job.job_id);

            const responseJsonSchema = {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        job_id: {
                            type: "integer",
                            enum: jobIdOptions,
                            description: "Must be the job_id of one of the user's saved jobs.",
                        },
                        tracking_status: {
                            type: "string",
                            enum: TRACKING_STATUS_OPTIONS,
                            description: "The new tracking status for this job.",
                        },
                    },
                    required: ["job_id", "tracking_status"],
                    additionalProperties: false,
                },
            };

            const interaction = await ai.interactions.create({
                model: "gemini-3.5-flash-lite",
                input: prompt,
                response_format: {
                    type: "text",
                    mime_type: "application/json",
                    schema: responseJsonSchema,
                },
            });

            const updateSchema = z.array(
                z.object({
                    job_id: z.number().refine((id) => jobIdOptions.includes(id), {
                        message: "job_id must match one of the user's saved jobs",
                    }),
                    tracking_status: z.enum(TRACKING_STATUS_OPTIONS),
                })
            );

            const updates = updateSchema.parse(JSON.parse(interaction.output_text));

            return updates;
        }

        return [];

    } catch (error) {
        console.error("Error in AICheckEmails:", error);
        throw error;
    }
}

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
        let emails = [];

        if (req.session.gmailTokens) {
            const oauth2Client = createOAuthClient();
            oauth2Client.setCredentials(req.session.gmailTokens);
            const gmail = google.gmail({ version: "v1", auth: oauth2Client });

            const profile = await gmail.users.getProfile({ userId: "me" });
            const emailAddress = profile.data.emailAddress;

            const existing = await db.SelectEmail(emailAddress);
            const now = new Date();

            let sinceDate;
            if (!existing) {
                sinceDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                await db.InsertNewEmail(emailAddress, now.toISOString());
            } else {
                sinceDate = new Date(existing.lastsync);
                await db.updateSyncValue(emailAddress, now.toISOString());
            }

            const afterTimestamp = Math.floor(sinceDate.getTime() / 1000);
            const emailQuery = `in:inbox -category:promotions -category:social after:${afterTimestamp}`;

            emails = await fetchEmailsForQuery(gmail, emailQuery);
            if (emails.length > 0){
                const updates = await AICheckEmails(emails);
                
                if (updates.length > 0) {
                    updates.forEach((update) => {
                        db.UpdateTracking(update.job_id, update.tracking_status);
                    });
                };
            };


        };

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

// ---------- Gmail sync ----------
// Parsing helpers below are ported from index.js's standalone script.

function getEmailBody(payload) {
    const plainText = findPart(payload, "text/plain");
    if (plainText) {
        return cleanText(plainText);
    }

    const html = findPart(payload, "text/html");
    if (html) {
        return htmlToText(html);
    }

    return "(No readable body)";
}

function findPart(payload, mimeType) {
    if (payload.mimeType === mimeType && payload.body?.data) {
        return decodeBase64Url(payload.body.data);
    }

    if (payload.parts) {
        for (const part of payload.parts) {
            const result = findPart(part, mimeType);
            if (result) {
                return result;
            }
        }
    }

    return null;
}

function decodeBase64Url(data) {
    return Buffer.from(data, "base64url").toString("utf8");
}

function cleanText(text) {
    return text
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n\s*\n+/g, "\n\n")
        .trim();
}

function htmlToText(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n\s*\n+/g, "\n\n")
        .trim();
}

async function fetchEmailsForQuery(gmail, query, maxResults) {
    const params = { userId: "me", q: query };
    if (maxResults) {
        params.maxResults = maxResults;
    }

    const result = await gmail.users.messages.list(params);
    const messages = result.data.messages || [];
    const emails = [];

    for (const message of messages) {
        const email = await gmail.users.messages.get({
            userId: "me",
            id: message.id,
            format: "full",
        });

        const payload = email.data.payload;
        const headers = payload.headers || [];

        const subject =
            headers.find((header) => header.name.toLowerCase() === "subject")?.value || "(No subject)";

        const body = getEmailBody(payload);

        emails.push({ subject, body });
    }

    return emails;
}

async function syncEmails(req, res) {
    try {
        if (!req.session.gmailTokens) {
            return res.status(401).json({ error: "Not signed in to Gmail." });
        }

        const oauth2Client = createOAuthClient();
        oauth2Client.setCredentials(req.session.gmailTokens);

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // For now, just the time the user signed in — a real
        // incremental-sync checkpoint (Gmail's historyId) can replace
        // this later once syncing needs to be more than "last 10".
        const lastsync = req.session.gmailSignInTime || new Date().toISOString();

        const emails = await fetchEmailsForQuery(
            gmail,
            "in:inbox -category:promotions -category:social",
            10
        );

        res.json({ lastsync, emails });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Unable to fetch emails." });
    }
}

module.exports = {
    getDashboard,
    getJobDetails,
    addNewJob,
    autoJobFill,
    editJob,
    makeEditChanges,
    deleteJob,
    syncEmails
}