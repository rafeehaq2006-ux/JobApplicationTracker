const pool = require ("./pool");

async function getAllJobs(){
    const { rows } = await pool.query("SELECT * FROM jobs");
    return rows;
}

async function insertNewJobs(jobobj){

}

async function getJob(id){
    const { rows } = await pool.query("SELECT * FROM jobs WHERE job_id = $1", [id]);
    return rows;
}

async function getAppliedJobs(){
    const { rows } = await pool.query("SELECT * FROM jobs WHERE tracking_status = 'Applied';");
    return rows;
}

async function getSavedJobs() {
    const { rows } = await pool.query("SELECT * FROM jobs WHERE tracking_status = 'Saved For Later';");
    return rows;   
}

async function getOfferedJobs() {
    const { rows } = await pool.query("SELECT * FROM jobs WHERE tracking_status = 'Offer Received';");
    return rows;
}

async function getRejectedJobs() {
    const { rows } = await pool.query("SELECT * FROM jobs WHERE tracking_status = 'Rejected';");
    return rows;
}

async function getOnlineAssesJobs() {
    const { rows } = await pool.query("SELECT * FROM jobs WHERE tracking_status = 'Online Assessment';");
    return rows;
}

async function getInterviewJobs() {
    const { rows } = await pool.query("SELECT * FROM jobs WHERE tracking_status = 'Interviewing';");
    return rows;
}

async function InsertNewJob(job) {
    const query = `
    INSERT INTO jobs (
    company_name,
    job_title,
    description,
    requirements,
    tracking_status,
    salary,
    location,
    website,
    applied )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;`;

    const values = [
        job.company_name,
        job.job_title,
        job.description,
        job.requirements,
        job.tracking_status,
        job.salary,
        job.location,
        job.website,
        job.applied    
    ];

    try{
        const { rows } = await pool.query(query, values);
        return rows[0];
    } catch (err){
        console.error(err);
    }
};

async function InsertTrackingInfo(jobid, updatedAt, tracking) {
    const query = `
    INSERT INTO tracking (
    job_id,
    status_update_at,
    tracking_status)
    VALUES ($1, $2, $3)`;
    
    const values = [
        jobid,
        updatedAt,
        tracking
    ];

    await pool.query(query, values);
};


module.exports = {
    getAllJobs,
    getJob,
    getAppliedJobs,
    getSavedJobs,
    getOfferedJobs,
    getRejectedJobs,
    getOnlineAssesJobs,
    getInterviewJobs,
    InsertNewJob,
    InsertTrackingInfo,
}