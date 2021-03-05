const express = require('express');
const router = express.Router();
const pool = require('../lib/dbpool');

// SELECT Threads from current user
router.post('/threads', (req, res) => {
  console.log('Incoming request for username: ' + req.body.username);
  console.log('Incoming request for subjectEmpty: ' + req.body.subjectEmpty);
  let selectQuery = '';

  pool.getConnection((err, connection) => {
    if (err) {
      console.log('Connection failed...');
      console.error(err);
    } else {
      console.log('Connection succeeded...');
      console.log(pool._allConnections.length);

      if(req.body.subjectEmpty)
      {
        selectQuery = `SELECT * FROM pre_forum_post WHERE author='${req.body.username}' AND subject = '';`;
      }
      else {
        selectQuery = `SELECT * FROM pre_forum_post WHERE author='${req.body.username}' AND subject != '';`;
      }
      // console.log(selectQuery);
      connection.query(selectQuery, (err, data) => {
        if (err) {
          res.json({
            success: false,
            Error: err,
          });
        } else {
          res.json({
            success: true,
            data: data,
          });
          console.log('Destroying connection for forum threads...');
          connection.destroy();
        }
      });
    }
  });
});

module.exports = router;
