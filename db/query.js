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
    const { rows } = await pool.query("SELECT * FROM jobs WHERE tracking_status = 'Offer Recieved';");
    return rows;
}

async function getRejectedJobs() {
    const { rows } = await pool.query("SELECT * FROM jobs WHERE tracking_status = 'Rejected';");
    return rows;
}

async function getOnlineAssesJobs() {
    const { rows } = await pool.query("SELECT * FROM jobs WHERE tracking_status = 'Online Assessments';");
    return rows;
}

async function getInterviewJobs() {
    const { rows } = await pool.query("SELECT * FROM jobs WHERE tracking_status = 'Interviewing';");
    return rows;
}

module.exports = {
    getAllJobs,
    getJob,
    getAppliedJobs,
    getSavedJobs,
    getOfferedJobs,
    getRejectedJobs,
    getOnlineAssesJobs,
    getInterviewJobs,
}