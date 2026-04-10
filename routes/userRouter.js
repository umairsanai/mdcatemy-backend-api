import express from "express";
import pool from "../database.js";
import { login, logout, protect } from "../controllers/auth.js";
import { handleAsyncError } from "../error.js";

const MILLISECONDS_IN_DAY = 86400000

const router = express.Router({mergeParams: true});


// Is there any need of /me?
// /dashboard-stats is doing the same!

router.get("/me", (req, res, next) => {
    res.status(200).json({
        status: "success",
        message: "Route in implementation..."
    });
});

router.get("/dashboard-stats", protect, handleAsyncError(async (req, res, next) => {
    let user = {};
    const yesterday = new Date(Date.now()-1*MILLISECONDS_IN_DAY).toISOString().split('T')[0];
    const {userID} = req.body;

    let userResult = await pool.query(`SELECT * FROM student WHERE student_id=$1`, [userID]);

    if (!userResult.rows.length) {
        return res.status(404).json({
            status: "error",
            message: "User not found"
        });
    }

    userResult = userResult.rows[0];
    user.name = userResult.name;
    user.email = userResult.email;
    user.streak = 0;
    user.today_attempt_count = 0;
    user.biology = { attempt: 0, correct: 0 };
    user.chemistry = { attempt: 0, correct: 0 };
    user.physics = { attempt: 0, correct: 0 };
    user.english = { attempt: 0, correct: 0 };
    user.logical_reasoning = { attempt: 0, correct: 0 };

    let yesterday_activity = await pool.query(`SELECT streak, activity_date::text FROM activity WHERE student_id=$1 AND activity_date=$2::DATE`, [userResult.student_id, yesterday]);

    if (yesterday_activity.rows.length == 0 && userResult.streak != 0) {
        await pool.query("UPDATE student SET streak=0 WHERE student_id=$1", [userResult.student_id]);
    } else if (yesterday_activity.rows.length && +yesterday_activity.rows[0].streak == userResult.streak) {
        user.streak = userResult.streak+1;
        await pool.query("UPDATE student SET streak=$1 WHERE student_id=$2", [userResult.streak+1, userResult.student_id]);
    } else if (yesterday_activity.rows.length) {
        user.streak = userResult.streak;
    }

    const today_acitivity = await pool.query(`SELECT attempt_count FROM activity WHERE student_id=$1 AND activity_date=$2::DATE`, [userResult.student_id, new Date()]);
    if (today_acitivity.rows.length != 0) {
        user.today_attempt_count = +today_acitivity.rows[0].attempt_count;
    }

    let subject_wise_attempt_count = (await pool.query(`SELECT COUNT(*), subjects.subject_name FROM attempted_mcqs INNER JOIN mcq_bank ON attempted_mcqs.mcq_id=mcq_bank.mcq_id INNER JOIN subjects ON subjects.subject_id=mcq_bank.subject_id WHERE student_id=$1 GROUP BY mcq_bank.subject_id, subjects.subject_name`, [userResult.student_id])).rows;
    let subject_wise_correct_count = (await pool.query(`SELECT COUNT(*), subjects.subject_name FROM attempted_mcqs INNER JOIN mcq_bank ON attempted_mcqs.mcq_id=mcq_bank.mcq_id INNER JOIN subjects ON subjects.subject_id=mcq_bank.subject_id WHERE student_id=$1 AND attempted_mcqs.selected_option=mcq_bank.correct_option GROUP BY mcq_bank.subject_id, subjects.subject_name`, [userResult.student_id])).rows;

    subject_wise_attempt_count.forEach(elem => {
        user[elem.subject_name.toLowerCase()].attempt = +elem.count;
    });
    subject_wise_correct_count.forEach(elem => {
        user[elem.subject_name.toLowerCase()].correct = +elem.count;
    });
    user.total_correct_count = user.biology.correct + user.chemistry.correct + user.physics.correct + user.english.correct + user.logical_reasoning.correct;
    user.total_attempt_count = user.biology.attempt + user.chemistry.attempt + user.physics.attempt + user.english.attempt + user.logical_reasoning.attempt;
    user.accuracy = !user.total_attempt_count ? 0 : Math.round((user.total_correct_count/user.total_attempt_count)*100);

    user.activity = (await pool.query(`SELECT attempt_count, correct_count, activity_date::text FROM activity WHERE student_id=$1 AND activity_date >= $2::DATE`, [userResult.student_id, new Date(Date.now()-7*MILLISECONDS_IN_DAY)])).rows;
    user.weak_topics = (await pool.query(`SELECT topics.topic_name, chapters.chapter_name, subjects.subject_name, ROUND(SUM(CASE WHEN outer_attempted_mcqs.selected_option=outer_mcq_bank.correct_option THEN 1 ELSE 0 END)*100 / (COUNT(*))) AS accuracy FROM attempted_mcqs outer_attempted_mcqs INNER JOIN mcq_bank outer_mcq_bank ON outer_mcq_bank.mcq_id=outer_attempted_mcqs.mcq_id INNER JOIN topics ON outer_mcq_bank.topic_id=topics.topic_id INNER JOIN chapters ON outer_mcq_bank.chapter_id=chapters.chapter_id INNER JOIN subjects ON outer_mcq_bank.subject_id=subjects.subject_id WHERE outer_attempted_mcqs.student_id=$1 GROUP BY outer_mcq_bank.topic_id, topic_name, chapter_name, subject_name ORDER BY accuracy ASC LIMIT 4`, [userResult.student_id])).rows;

    res.status(200).json({
        status: "success",
        data: user 
    });
}));

router.get("/saved-mcqs", (req, res, next) => {
    res.status(200).json({
        status: "success",
        message: "Route in implementation..."
    });
});

router.get("/login", login)
router.get("/logout", logout);


export default router;