const express = require('express');
const router = express.Router();
const pool = require('../lib/dbpool');
const md5 = require('md5');

// Generate a 6-digit random string
function uniqid(length) {
  var result = '';
  var characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

router.get('/logout', (req, res) => {
  if (req.session.user) {
    req.session.destroy();
    res.send({
      loggedOut: true,
      result: 'Logged out successfully!',
    });
  }
});

router.get('/login', (req, res) => {
  if (req.session.user) {
    res.send({
      loggedIn: true,
      user: req.session.user,
      feedback: 'You are logged in!',
    });
  } else {
    res.send({
      loggedIn: false,
    });
  }
})

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  pool.getConnection((err, connection) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Connection succeeded...');
      console.log('Active connections: ' + pool._allConnections.length);
      let queryStatements = `SELECT * FROM pre_ucenter_members WHERE username='${username}'`;
      connection.query(queryStatements, (err, data) => {
        if (err) {
          res.send({ Error: err });
          console.log(err);
          console.log('Destroying connection for forum threads...');
          connection.destroy();
        } else {
          if (data.length > 0) {
            const realPwHash = data[0].password;
            const thisPwHash = md5(md5(password) + data[0].salt);
            if (realPwHash === thisPwHash) {
              req.session.user = {
                username: data[0].username,
                uid: data[0].uid,
              };
              console.log('Logged in user: ' + JSON.stringify(req.session.user));
              res.send({
                loggedIn: true,
                user: req.session.user,
                feedback: 'You are logged in!',
              });
              console.log('Destroying connection for forum threads...');
              connection.destroy();
            } else {
              res.send({
                loggedIn: false,
                feedback: 'No such username-password combination found!',
              });
              console.log('Destroying connection for forum threads...');
              connection.destroy();
            }
          } else {
            res.send({
              loggedIn: false,
              feedback: 'No such username-password combination found!',
            });
            console.log('Destroying connection for forum threads...');
            connection.destroy();
          }
        }
      });
    }
  });
});

// INSERT new user credentials into DB
router.post('/signup', (req, res) => {
  const { username, password, email, gender } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const regip = ip.split(':')[3];
  const regdate = Math.floor((new Date().getTime()) / 1000);
  const groupid = 10;
  const credits = 2;
  const timeoffset = 9999;
  const salt = uniqid(6);
  const saltHash = md5(salt);
  const passwordHash = md5(md5(password) + salt);
  pool.getConnection((err, connection) => {
    if (err) {
      console.log('Connection failed...');
      console.error(err);
    } else {
      console.log('Connection succeeded...');
      console.log(pool._allConnections.length);
      let queryStatements = `INSERT INTO pre_common_member (email, username, password, groupid, regdate, credits, timeoffset) VALUES ('${email}', '${username}', '${saltHash}', ${groupid},${regdate},${credits},${timeoffset});`;
      queryStatements += `INSERT INTO pre_ucenter_members (username, password, email, regip, regdate, salt) VALUES ('${username}', '${passwordHash}', '${email}', '${regip}', ${regdate}, '${salt}');`;
      queryStatements += `SELECT LAST_INSERT_ID();`;
      connection.query(queryStatements, (err, data) => {
        if (err) {
          res.json({ Error: err });
          console.log('Destroying connection for forum threads...');
          connection.destroy();
        } else {
          const uid = (data[2][0]['LAST_INSERT_ID()']);
          // console.log(typeof uid);
          queryStatements = `INSERT INTO pre_common_member_profile (uid, gender, bio, interest, field1, field2, field3, field4, field5, field6, field7, field8) VALUES (${uid}, ${gender}, '', '', '', '', '', '', '', '', '', '');`;
          connection.query(queryStatements, (err, data) => {
            if (err) {
              res.send({
                Error: err,
                success: false,
              });
              console.log('Destroying connection for forum threads...');
              connection.destroy();
            } else {
              res.send({
                Data: data,
                success: true,
              });
              console.log('Destroying connection for forum threads...');
              connection.destroy();
            }
          });
        }
      });
    }
  });
});

router.post('/signup/username', (req, res) => {
  const username = req.body.username;
  pool.getConnection((err, connection) => {
    if (err) {
      console.log('Connection failed...');
      console.error(err);
    } else {
      console.log('Connection succeeded...');
      console.log(pool._allConnections.length);
      let queryStatements = `SELECT * FROM pre_ucenter_members WHERE username='${username}'`;
      connection.query(queryStatements, (err, data) => {
        if (err) {
          res.json({ Error: err });
          console.log(err);
          console.log('Destroying connection for forum threads...');
          connection.destroy();
        } else {
          if (data.length > 0) {
            res.json({
              usernameExists: true,
            });
          } else {
            res.json({
              usernameExists: false,
            });
          }
          console.log('Destroying connection for forum threads...');
          connection.destroy();
        }
      });
    }
  });
});

module.exports = router;
