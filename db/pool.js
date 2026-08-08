const { Pool } = require("pg");
require("dotenv").config();
module.exports = new Pool({
    connectionString: process.env.dbURI,
    client_encoding: 'UTF8'
});