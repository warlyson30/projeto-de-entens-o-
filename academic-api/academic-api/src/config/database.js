const mysql = require('mysql2/promise');
const config = require('./environment');

const pool = mysql.createPool({
  host:     config.database.host,
  user:     config.database.user,
  password: config.database.password,
  database: config.database.database,
  waitForConnections: true,
  connectionLimit:    10,
});

module.exports = pool;
