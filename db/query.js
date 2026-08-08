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

module.exports = {
    getAllJobs,
    getJob,
}