const mysql = require("mysql")
const config = require("../config")
const router = require("express").Router();
const bcrypt = require("bcrypt");
const session = require('express-session')
const saltRounds = 10
const multer = require('multer')
const fs = require('fs')
const path = require('path')

const jwt = require('jsonwebtoken');
const { promisify } = require("util");
const { sendEmail } = require("../mail");
const { RSA_PKCS1_OAEP_PADDING } = require("constants");
const pipeline = promisify(require("stream").pipeline)


const db = mysql.createPool(config.mysql);

const upload = multer()

router.post("/register", (req, res) => {
    //var query = `insert into users (username, password) values ("${req.body.username}", "${req.body.password}");`
    const user_type = req.body.is_teacher ? 1: 0
    //const pathname = `${__dirname}/../public/profile_pics/${username}`

    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {

        var query = `insert into users (username, user_type, password) select "${req.body.username}", ${user_type},"${hash}" where not exists (select username from users where username = "${req.body.username}");`

        db.query(query, (err, result) => {
            if(err) {

                res.status(400).send(err.message);
            }
            return res.status(200).send(result);
        })

    })

});

router.post("/teacher", upload.single("file"), async function (req, res, next) {
    var doc_url = '';

    try {
        var filename = req.body.id + Math.floor(Math.random() * 1000) + req.file.detectedFileExtension;

        await pipeline(req.file.stream, fs.createWriteStream(`${__dirname}/../public/documents/${filename}`))
        doc_url = `http://localhost:5000/documents/${filename}`
        
        var query = `insert into teachers(user_id, first_name, last_name, email_id, image_link, qualification, rating_points, sessions_taken, verfied, doc_link) values (${req.body.id}, "${req.body.first_name}", "${req.body.last_name}", "${req.body.email_id}", "${req.body.image_link}", "${req.body.qualification}" , 0, 0, 0, "${doc_url}");`
        db.query(query, (err, result) => {
            if(err) {
                res.status(400).send(err.message);
            }
            res.status(200).send(result)
        })
    }
    catch(err) {
        console.status(400).send(err.message)
    }
})

router.get("/teacher", (req, res) => {
    var query = `select * from teachers where user_id = ${req.query.id}`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})

router.post("/student", (req, res) => {
    var query = `insert into students(user_id, first_name, last_name, email_id, image_link, grade, board, session_taken) values (${req.body.id}, "${req.body.first_name}", "${req.body.last_name}", "${req.body.email_id}", "${req.body.image_link}", ${req.body.grade}, "${req.body.board}" , 0);`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message);
        }
        res.status(200).send(result)
    })
})

router.get("/student", (req, res) => {
    var query = `select * from students where user_id = ${req.query.id}`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})


router.post("/login", (req, res) => {
    var query = `select user_id, username, password, user_type from users where username="${req.body.username}";`
    db.query(query, (err, result) => {
        if(err) {
            return res.status(400).send(err.message);
        }

        if(result.length > 0) {
            bcrypt.compare(req.body.password, result[0].password, (error, response) => {

                if(response) {
                    req.session.user = result;
                    //console.log(`After login ${req.session.user}`)
                    res.send(result);
                }
                else {
                    res.send({message: "Password and username combination doesn't match"})
                }
            })

        }
        else {
            res.send({message: "User doesn't exist in database."})
        }

    })
})

router.get("/user", (req, res) => {
    var query = `select * from users where username = "${req.query.username}";`
    db.query(query, (err, result) => {
        if(err) {
            return res.status(400).send(err.message)
        }
        if(result.length > 0) {
            return res.status(200).send(result)
        }
        else {
            return res.status(200).send({message: "User doesn't exist"})
        }
    })
})

router.get('/login', (req, res) => {
    //console.log(`After login req ${req.session.user}`)
    if(req.session.user) {
        res.send({loggedIn: true, user: req.session.user})
    }
    else {
        res.send({loggedIn: false})
    }
})

router.post('/logout', (req, res) => {
    req.session.destroy();
    res.send({loggedIn: false})
})

router.post('/editteacher', upload.single("file"), async function (req, res, next) {

    var filename = ''
    var image_url = ''

    console.log(req.file)

    if(req.file === null) {
        image_url = req.body.oldurl
    }
    else {
        var def = false
        if(req.body.oldurl.localeCompare("http://localhost:5000/profile_pics/default.png") === 0)
        def = true
        try {
            filename = req.body.user_id + Math.floor(Math.random() * 1000) + req.file.detectedFileExtension;
            await pipeline(req.file.stream, fs.createWriteStream(`${__dirname}/../public/profile_pics/${filename}`))
            image_url = `http://localhost:5000/profile_pics/${filename}`
            if(!def) {
                const paths = `${__dirname}/../public/${req.body.oldurl.slice(22)}`
                fs.unlink(paths, (err) => {
                    if(err) {
                        console.log(err)
                    }
                })
            }
        }
        catch(error){
            console.log(error)
        }
    }

    var query = `update teachers set first_name="${req.body.first_name}", last_name="${req.body.last_name}", email_id="${req.body.email_id}", qualification="${req.body.qualification}", image_link="${image_url}" where user_id=${req.body.user_id};`

    db.query(query, (err, result) => {
        if(err) {
            return res.status(400).send(err.message);
        }
        res.status(200).send(result)
    })
})

router.post('/editstudent', upload.single("file"), async function (req, res, next) {

    var filename = ''
    var image_url = ''

    console.log(req.file)

    if(req.file === null) {
        image_url = req.body.oldurl
    }
    else {
        var def = false
        if(req.body.oldurl.localeCompare("http://localhost:5000/profile_pics/default.png") === 0)
        def = true
        try {
            filename = req.body.user_id + Math.floor(Math.random() * 1000) + req.file.detectedFileExtension;
            await pipeline(req.file.stream, fs.createWriteStream(`${__dirname}/../public/profile_pics/${filename}`))
            image_url = `http://localhost:5000/profile_pics/${filename}`
            if(!def) {
                const paths = `${__dirname}/../public/${req.body.oldurl.slice(22)}`
                fs.unlink(paths, (err) => {
                    if(err) {
                        console.log(err)
                    }
                })
            }
        }
        catch(error){
            console.log(error)
        }
    }

    var query = `update students set first_name="${req.body.first_name}", last_name="${req.body.last_name}", email_id="${req.body.email_id}", grade=${req.body.grade}, board="${req.body.board}", image_link="${image_url}" where user_id=${req.body.user_id};`
    db.query(query, (err, result) => {
        if(err) {
            return res.status(400).send(err.message);
        }
        res.status(200).send(result)
    })
})


router.get("/student_subjects", (req, res) => {
    var query = `select student_subjects.subject_id, subject.subject_name from student_subjects join subject on student_subjects.subject_id = subject.subject_id where student_subjects.student_id = ${req.query.id};`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})

router.get("/teacher_subjects", (req, res) => {
    var query = `select teacher_subjects.subject_id, subject.subject_name from teacher_subjects join subject on teacher_subjects.subject_id = subject.subject_id where teacher_subjects.teacher_id = ${req.query.id};`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})

router.get("/languages", (req, res) => {
    var query = `select teacher_languages.language_id, languages.language_name from teacher_languages join languages on teacher_languages.language_id = languages.language_id where teacher_languages.teacher_id = ${req.query.id};`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})

router.get("/all_languages", (req, res) => {
    var query = "select * from languages;"
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})

router.get("/all_subjects", (req, res) => {
    var query = "select * from subject;"
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})

router.post("/add_language", (req, res) => {
    var query = `insert into teacher_languages (teacher_id, language_id) values (${req.body.user_id}, ${req.body.language_id});`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})

router.post("/add_student_subject", (req, res) => {
    var query = `insert into student_subjects (student_id, subject_id) values (${req.body.user_id}, ${req.body.subject_id});`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})

router.post("/add_teacher_subject", (req, res) => {
    var query = `insert into teacher_subjects (teacher_id, subject_id) values (${req.body.user_id}, ${req.body.subject_id});`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})


router.post("/del_language", (req, res) => {
    var query = `delete from teacher_languages where teacher_id = ${req.body.user_id} and language_id = ${req.body.language_id};`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})

router.post("/del_student_subject", (req, res) => {
    var query = `delete from student_subjects where student_id = ${req.body.user_id} and subject_id = ${req.body.subject_id};`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})

router.post("/del_teacher_subject", (req, res) => {
    var query = `delete from teacher_subjects where teacher_id = ${req.body.user_id} and subject_id = ${req.body.subject_id};`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})

router.post("/update_points", (req, res) => {
    var query = `update teachers set rating_points = (rating_points + ${req.body.review}), sessions_taken = (sessions_taken + 1) where user_id = ${req.body.user_id};`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})

router.post("/update_session_count", (req, res) => {
    var query = `update students set session_taken = (session_taken + 1) where user_id = ${req.body.student_id};`
    console.log(query)
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})


router.get("/recommendations", (req, res) => {
    var query = `select * from teachers join (select distinct teacher_subjects.teacher_id as t_id from student_subjects join teacher_subjects on student_subjects.subject_id = teacher_subjects.subject_id where student_subjects.student_id = ${req.query.student_id}) teach where teach.t_id = teachers.user_id and teachers.verfied = 1 order by teachers.rating_points DESC limit 12;`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result)
        }
    })
})

router.post("/sendmail", (req, res) => {
    sendEmail(req.body)
    res.status(200).send("yes")
})

router.post("/verify", (req, res) => {
    var query = `update teachers set verfied = 1 where user_id = ${req.body.user_id};`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result);
        }
    })
})

router.post("/suspend", (req, res) => {
    var query = `update teachers set verfied = 2 where user_id = ${req.body.user_id};`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result);
        }
    })
})

router.post("/changeVerfied", (req, res) => {
    var query = `update teachers set verfied = 0 where user_id = ${req.body.user_id};`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result);
        }
    })
})

router.get("/get_all_teachers", (req, res) => {
    var query = `select * from teachers order by user_id DESC;`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result);
        }
    })
})

router.get("/get_all_students", (req, res) => {
    var query = `select * from students order by user_id DESC;`
    db.query(query, (err, result) => {
        if(err) {
            res.status(400).send(err.message)
        }
        else {
            res.status(200).send(result);
        }
    })
})

router.post("/resetPassword", (req, res) => {
    const user_type = req.body.user_type
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {

        var query = `update users set password = "${hash}" where username = "${req.body.username}";`
        db.query(query, (err, result) => {
            if(err) {

                res.status(400).send(err.message);
            }
            return res.status(200).send(result);
        })

    })

})


module.exports = router;
