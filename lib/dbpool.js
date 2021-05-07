const mysql = require('mysql');
const localTestDB = {
  host: 'localhost',
  port: '3306',
  user: 'root',
  password: 'Trafalgar1piece@trtdytr',
  database: 'canadaasians',
  multipleStatements: true,
  insecureAuth : true,
};
const pool = mysql.createPool(localTestDB);


module.exports = pool;
