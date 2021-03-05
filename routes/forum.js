const express = require('express');
const router = express.Router();
const pool = require('../lib/dbpool');
const path = require('path');
const fs = require('fs');
const serverURL = require('../lib/server-config.js');

const multer = require('multer');
const md5 = require('md5');
const tempStorage = './public/uploads/data/attachment/forum/';
const storage = multer.diskStorage({
  destination: tempStorage,
  filename: (req, file, cb) => {
    cb(null, "IMAGE-" + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100000000000 },
}).array('files');

// SELECT Threads order by dateline
router.get('/threads/:fid/:sort', (req, res) => {
  const reqSort = req.params.sort;
  let sort = 'lastreply';
  if (reqSort === 'lastcreate') {
    sort = 'dateline';
  } else if (reqSort === 'lastreply') {
    sort = 'lastpost'
  }
  console.log('Incoming request for fid: ' + req.params.fid);
  pool.getConnection((err, connection) => {
    if (err) {
      console.log('Connection failed...');
      console.error(err);
    } else {
      console.log('Connection succeeded...');
      console.log(pool._allConnections.length);
      connection.query(`SELECT a.fid, a.pid, a.author, a.subject, a.message, a.dateline, a.attachment, b.tid, b.lastpost FROM pre_forum_post as a INNER JOIN pre_forum_thread as b ON a.tid=b.tid WHERE a.fid=${req.params.fid} AND a.subject !='' ORDER BY b.${sort} DESC`, (err, data) => {
        if (err) {
          res.json({ Error: err });
        } else {
          // const selected = data[0].message.includes('\n');
          // console.log('Data: ' + selected);
          res.json(data);
          console.log('Destroying connection for forum threads...');
          connection.destroy();
        }
      });
    }
  });
});

// // SELECT Threads order by lastpost
// router.get('/lastreply/:fid/:from/:number', (req, res) => {
//   console.log('Incoming request for fid: ' + req.params.fid);
//   pool.getConnection((err, connection) => {
//     if (err) {
//       console.log('Connection failed...');
//       console.error(err);
//     } else {
//       console.log('Connection succeeded...');
//       console.log(pool._allConnections.length);
//       connection.query(`SELECT a.fid, a.pid, a.subject, a.author, a.message, a.dateline, b.tid, b.lastpost FROM pre_forum_post as a INNER JOIN pre_forum_thread as b ON a.tid=b.tid WHERE a.fid=${req.params.fid} AND a.subject !='' ORDER BY b.lastpost DESC limit ${parseInt(req.params.from)}, ${req.params.number}`, (err, data) => {
//         if (err) {
//           res.json({ Error: err });
//         } else {
//           res.json(data);
//           console.log('Destroying connection for forum threads...');
//           connection.destroy();
//         }
//       });
//     }
//   });
// });

// SELECT threads contain 'keyword'
router.get('/search/:keyword', (req, res) => {
  console.log('Incoming request for keyword: ' + req.params.keyword);
  pool.getConnection((err, connection) => {
    if (err) {
      console.log('Connection failed...');
      console.error(err);
    } else {
      console.log('Connection succeeded...');
      console.log(pool._allConnections.length);
      connection.query(`SELECT author, subject, message, tid, fid, dateline FROM pre_forum_post WHERE subject LIKE '%${req.params.keyword}%' ORDER BY dateline DESC`, (err, data) => {
        if (err) {
          res.json({ Error: err });
        } else {
          res.json(data);
          console.log('Destroying connection for searching...');
          connection.destroy();
        }
      });
    }
  });
});

// SELECT threads contain 'keyword' with given 'fid'
router.get('/search/:fid/:keyword', (req, res) => {
  console.log('Incoming request for fid: ' + req.params.keyword);
  pool.getConnection((err, connection) => {
    if (err) {
      console.log('Connection failed...');
      console.error(err);
    } else {
      console.log('Connection succeeded...');
      console.log(pool._allConnections.length);
      connection.query(`SELECT author, subject, message, tid, fid, dateline FROM pre_forum_post WHERE fid=${req.params.fid} AND subject LIKE '%${req.params.keyword}%' ORDER BY dateline DESC`, (err, data) => {
        if (err) {
          res.json({ Error: err });
        } else {
          res.json(data);
          console.log('Destroying connection for searching...');
          connection.destroy();
        }
      });
    }
  });
});

// SELECT posts with given 'fid'
router.get('/comments/:tid', (req, res) => {
  console.log('Incoming request for posts with tid: ' + req.params.tid);
  pool.getConnection((err, connection) => {
    if (err) {
      console.log('Connection failed...');
      console.error(err);
    } else {
      console.log('Connection succeeded...');
      console.log(pool._allConnections.length);
      connection.query(`SELECT author, message, tid, pid, dateline FROM pre_forum_post WHERE tid=${req.params.tid} AND subject='' ORDER BY dateline DESC`, (err, data) => {
        if (err) {
          res.json({ Error: err });
        } else {
          res.json(data);
          console.log('Destroying connection for searching...');
          connection.destroy();
        }
      });
    }
  });
});

router.get('/', (req, res) => {
  console.log('Incoming request for forums list');
  pool.getConnection((err, connection) => {
    if (err) {
      console.log('Connection failed...');
    } else {
      console.log('Connection succeeded...');
      console.log(pool._allConnections.length);
      connection.query(`SELECT fid, name FROM pre_forum_forum WHERE threads > 0`, (err, data) => {
        if (err) {
          res.json({ Error: err });
          connection.destroy();
        } else {
          res.json(data);
          connection.destroy();
        }
      });
    }
  });
});

router.post("/comment", (req, res) => {
  const port = req.connection.remotePort;
  const useip = req.connection.remoteAddress.split(':')[3];
  const fid = req.body.fid;
  const tid = req.body.tid;
  const author = req.body.author;
  const authorid = req.body.authorid;
  const subject = req.body.subject;
  const message = req.body.message;
  const dateline = req.body.dateline;
  const attachment = 0;
  const smileyoff = -1;
  const first = 0;
  const postStatus = 0;
  pool.getConnection((poolConnErr, connection) => {
    if (poolConnErr) {
      console.log('Connection failed: ' + poolConnErr);
    } else {
      console.log('Connection succeeded...');
      console.log(pool._allConnections.length);
      let queries = `SELECT replies from pre_forum_thread WHERE tid=${tid}`;
      connection.query(queries, (checkRepliesErr, checkRepliesData) => {
        if (checkRepliesErr) {
          res.json({
            success: false,
            Err: checkRepliesErr,
          });
          connection.destroy();
        } else {
          const position = checkRepliesData[0].replies+2;
          queries = `INSERT INTO pre_forum_post_tableid () VALUES ();`;
          queries += `SELECT LAST_INSERT_ID();`;
          connection.query(queries, (checkPidErr, checkPidData) => {
            if (checkPidErr) {
              res.json({
                success: false,
                Err: checkPidErr,
              });
              connection.destroy();
            } else {
              const pid = (checkPidData[1][0]['LAST_INSERT_ID()']);
              console.log('authorid: ' + authorid);
              queries = `INSERT INTO pre_forum_post (pid, fid, tid, first, author, authorid, subject, dateline, message, useip, port, smileyoff, attachment, status, position) VALUES (${pid}, ${fid}, ${tid}, ${first}, '${author}', ${authorid}, '${subject}', ${dateline}, '${message}', '${useip}', ${port}, ${smileyoff}, ${attachment}, ${postStatus}, ${position});`;
              // console.log('Query: ' + queries);
              connection.query(queries, (insertPostErr, insertPostData) => {
                if (insertPostErr) {
                  console.log('Failed at inserting into pre_forum_post');
                  res.json({
                    success: false,
                    Err: insertPostErr,
                  });
                  connection.destroy();
                } else {
                  queries = `UPDATE pre_forum_forum SET posts=posts+1 WHERE fid=${fid};`;
                  queries += `UPDATE pre_forum_thread SET replies=replies+1, maxposition=maxposition+1, views=views+1, lastpost=${dateline}, lastposter='${author}' WHERE tid=${tid};`;
                  // queries += `UPDATE pre_common_member_count SET threads=threads+1, posts=posts+1, extcredits2=extcredits2+2 WHERE uid=${authorid};`;
                  connection.query(queries, (updateErr, updateData) => {
                    if (updateErr) {
                      console.log('Failed at inserting into counting tables, Err: ' + err);
                      res.json({
                        success: false,
                        Err: updateErr,
                      });
                      connection.destroy();
                    } else {
                      res.json({
                        success: true,
                        commentPID: pid,
                      });
                      connection.destroy();
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  })
});

router.post("/thread", (req, res) => {
  upload(req, res, err => {
    // datas for pre_forum_post
    const port = req.connection.remotePort;
    const useip = req.connection.remoteAddress.split(':')[3];
    const fid = req.body.fid;
    const author = req.body.author;
    const authorid = req.body.authorid;
    const subject = req.body.subject;
    let message = req.body.message;
    const dateline = req.body.dateline;
    const attachment = req.files.length;
    const smileyoff = -1;
    const first = 1;
    const postStatus = 0;
    const position = 1;
    // datas for pre_forum_thread
    const threadStatus = 32;
    const views = 1;
    const maxposition = 1;
    const stamp = -1;
    const icon = -1;

    pool.getConnection((err, connection) => {
      if (err) {
        console.log('Connection failed...');
      } else {
        console.log('Connection succeeded...');
        console.log(pool._allConnections.length);
        // Insert attachments into attachment tables first, if there are attachments
        let queries = '';
        // INSERT INTO pre_forum_post_tableid to get auto-incremented pid;
        queries = `INSERT INTO pre_forum_post_tableid () VALUES ();`;
        queries += `SELECT LAST_INSERT_ID();`;
        connection.query(queries, (err, data) => {
          if (err) {
            res.json({
              success: false,
              Err: err,
            });
            connection.destroy();
          } else {
            const pid = (data[1][0]['LAST_INSERT_ID()']);
            queries = `INSERT INTO pre_forum_thread (fid, author, authorid, subject, dateline, lastpost, lastposter, views, attachment, status, stamp, icon, maxposition) VALUES (${fid}, '${author}', ${authorid}, '${subject}', ${dateline}, ${dateline}, '${author}', ${views}, ${attachment}, ${threadStatus}, ${stamp}, ${icon}, ${maxposition});`;
            queries += `SELECT LAST_INSERT_ID();`;
            connection.query(queries, (err, data) => {
              if (err) {
                console.log(err);
                res.json({
                  success: false,
                  Err: err,
                });
                connection.destroy();
              } else {
                const tid = (data[1][0]['LAST_INSERT_ID()']);
                if (attachment > 0) {
                  console.log('Inserting attachments!!!!!!!!!!!!!!!!!!!!!!!!');
                  const currDate = new Date(dateline * 1000);
                  const currYear = currDate.getFullYear().toString();
                  let currMonth = (currDate.getMonth() + 1).toString();
                  let currDay = currDate.getDate().toString();
                  const currHour = currDate.getHours().toString();
                  const currMinute = currDate.getMinutes().toString();
                  const currSecond = currDate.getSeconds().toString();
                  currMonth = currMonth.length === 1 ? "0" + currMonth : currMonth;
                  currDay = currDay.length === 1 ? "0" + currDay : currDay;
                  const attachTableID = (tid % 10);
                  const attachTableName = 'pre_forum_attachment_' + attachTableID;
                  const attachDest = `${currYear}${currMonth}/${currDay}/`;
                  queries = '';
                  for (let i = 0; i < attachment; i++) {
                    let attachType = req.files[i].mimetype.match(/(png|jpg|jpeg|gif)/g);
                    attachType = attachType.length === 1 ? attachType[0] : 'unknown';
                    const attachSize = req.files[i].size;
                    const insertTime = new Date();
                    // const attachFilename = '' + insertTime.getFullYear() + (insertTime.getMonth() + 1) + insertTime.getDate() + insertTime.getHours() + insertTime.getMinutes() + insertTime.getSeconds() + insertTime.getMilliseconds() + '.' + attachType;
                    const attachFilename = req.files[i].originalname;
                    const attachmentname = attachDest + currHour + currMinute + currSecond + md5(attachFilename).slice(0, 16) + '.' + attachType;

                    fs.promises.mkdir(path.dirname(tempStorage + attachmentname), { recursive: true }).then(() => {
                      fs.promises.copyFile(req.files[i].path, tempStorage + attachmentname)
                        .then(() => {
                          fs.unlink(req.files[i].path, unlinkError => {
                            if (unlinkError) throw unlinkError;
                            console.log('File cut and pasted to destination!');
                          });
                        });
                    });
                    // console.log('file' + i + ': ' + attachFilename);
                    queries = `INSERT INTO pre_forum_attachment (tid, pid, uid, tableid) VALUES (${tid}, ${pid}, ${authorid}, ${attachTableID});`;
                    queries += `SELECT LAST_INSERT_ID();`
                    connection.query(queries, (err, data) => {
                      if (err) {
                        console.log('failed at inserting into pre_forum_attachment, err: ' + err);
                        res.json({
                          success: false,
                          Err: err,
                        });
                        connection.destroy();
                      } else {
                        const aid = (data[1][0]['LAST_INSERT_ID()']);
                        message += `\n[attach]${aid}[/attach]`;
                        queries = `INSERT INTO ${attachTableName} (aid, tid, pid, uid, dateline, filename, filesize, attachment, isimage, width, description) VALUES (${aid}, ${tid}, ${pid}, ${authorid}, ${Math.floor(insertTime.getTime() / 1000)}, '${attachFilename}', ${attachSize}, '${attachmentname}', ${1}, ${0}, 'En_Mobile');`;
                        connection.query(queries, (err, data) => {
                          if (err) {
                            // console.log('attachFilename: ' + attachFilename);
                            console.log('failed at inserting into ' + attachTableName + ', err: ' + err);
                            res.json({
                              success: false,
                              Err: err,
                            });
                            connection.destroy();
                          } else {
                            console.log('Successfully inserted ' + attachmentname);
                            if (i === attachment - 1) {
                              queries = `INSERT INTO pre_forum_post (pid, fid, tid, first, author, authorid, subject, dateline, message, useip, port, smileyoff, attachment, status, position) VALUES (${pid}, ${fid}, ${tid}, ${first}, '${author}', ${authorid}, '${subject}', ${dateline}, '${message}', '${useip}', ${port}, ${smileyoff}, ${attachment}, ${postStatus}, ${position});`;
                              // console.log('Query: ' + queries);
                              connection.query(queries, (err, data) => {
                                if (err) {
                                  console.log('Failed at inserting into pre_forum_post');
                                  res.json({
                                    success: false,
                                    Err: err,
                                  });
                                  connection.destroy();
                                } else {
                                  queries = `UPDATE pre_forum_forum SET threads=threads+1, posts=posts+1 WHERE fid=${fid};`;
                                  // queries += `UPDATE pre_common_member_count SET threads=threads+1, posts=posts+1, extcredits2=extcredits2+2 WHERE uid=${authorid};`;
                                  connection.query(queries, (err, data) => {
                                    if (err) {
                                      console.log('Failed at inserting into counting tables, Err: ' + err);
                                      res.json({
                                        success: false,
                                        Err: err,
                                      });
                                      connection.destroy();
                                    } else {
                                      res.json({
                                        success: true,
                                        currentFid: fid,
                                        uploadedImages: attachment,
                                      });
                                      connection.destroy();
                                    }
                                  });
                                }
                              });
                            }
                          }
                        });
                      }
                    });
                  }
                } else {
                  // no attachments, simply insert posts
                  queries = `INSERT INTO pre_forum_post (pid, fid, tid, first, author, authorid, subject, dateline, message, useip, port, smileyoff, attachment, status, position) VALUES (${pid}, ${fid}, ${tid}, ${first}, '${author}', ${authorid}, '${subject}', ${dateline}, '${message}', '${useip}', ${port}, ${smileyoff}, ${attachment}, ${postStatus}, ${position});`;
                  connection.query(queries, (err, data) => {
                    if (err) {
                      console.log('Failed at inserting into pre_forum_post');
                      res.json({
                        success: false,
                        Err: err,
                      });
                      connection.destroy();
                    } else {
                      queries = `UPDATE pre_forum_forum SET threads=threads+1, posts=posts+1 WHERE fid=${fid};`;
                      // queries += `UPDATE pre_common_member_count SET threads=threads+1, posts=posts+1, extcredits2=extcredits2+2 WHERE uid=${authorid};`;
                      connection.query(queries, (err, data) => {
                        if (err) {
                          console.log('Failed at inserting into counting tables, Err: ' + err);
                          res.json({
                            success: false,
                            Err: err,
                          });
                          connection.destroy();
                        } else {
                          console.log('New Post Fid: ' + fid);
                          res.json({
                            success: true,
                            currentFid: fid,
                            uploadedImages: attachment,
                          });
                          connection.destroy();
                        }
                      });
                    }
                  });
                }
              }
            });
          }
        });
      }
    });
  });

});

router.post("/attach", (req, res) => {
  const tid = req.body.tid;
  const tableName = 'pre_forum_attachment_' + tid % 10;
  let conditionStatement = 'aid=' + req.body.aidList[0];
  for (let i = 1; i < req.body.aidList.length; i++) {
    conditionStatement += ` OR aid=${req.body.aidList[i]}`;
  }
  conditionStatement += ';';
  // console.log(conditionStatement);
  pool.getConnection((err, connection) => {
    if (err) {
      console.log('Connection failed...');
      res.send({ success: false });
    } else {
      console.log('Connection succeeded...');
      // console.log(pool._allConnections.length);
      // console.log(`SELECT aid, tid, pid, uid, attachment FROM ${tableName} WHERE ${conditionStatement}`);
      connection.query(`SELECT aid, tid, pid, uid, attachment, description FROM ${tableName} WHERE ${conditionStatement}`, (err, data) => {
        if (err) {
          res.send({ success: false });
          connection.destroy();
        } else {
          let pathIndexPairs = [];
          for (let i = 0; i < data.length; i++) {
            const attachFolder = (data[i].description === 'En_Mobile') ? serverURL + "/uploads/data/attachment/forum/" : "https://www.canadaasians.com/data/attachment/forum/";
            pathIndexPairs[i] = {
              aid: data[i].aid,
              path: attachFolder + data[i].attachment,
            };
          }
          res.send({
            success: true,
            pathIndexPairs: pathIndexPairs,
          });
          connection.destroy();
        }
      });
    }
  });
});

module.exports = router;
