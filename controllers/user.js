import pool from "../database.js";
import { AppError, handleAsyncError } from "../error.js";
import { isString } from "../helpers.js";

const SAVED_MCQS_PER_PAGE = 10;
const MILLISECONDS_IN_DAY = 86400000;

export const getDashboardStats = handleAsyncError(async (req, res, next) => {
    let user = {
        name: "",
        email: "",
        streak: 0,
        today_attempt_count: 0,
        total_attempt_count: 0,
        total_correct_count: 0,
        biology: { attempt: 0, correct: 0 },
        chemistry: { attempt: 0, correct: 0 },
        physics: { attempt: 0, correct: 0 },
        english: { attempt: 0, correct: 0 },
        logical_reasoning: { attempt: 0, correct: 0 }
    };
    
    let userResult = await pool.query(`SELECT student_id, name, email, streak FROM student WHERE student_id=$1`, [req.user.student_id]);
    
    if (!userResult.rows.length)
        return next(new AppError("No Such User Exists", 404));
    
    userResult = userResult.rows[0];
    user.name = userResult.name;
    user.email = userResult.email;

    const yesterday = new Date(Date.now()-1*MILLISECONDS_IN_DAY).toISOString().split('T')[0];
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

    const subject_wise_mcq_counts = (await pool.query(`SELECT subjects.subject_name, SUM(1) AS attempt_count, SUM(CASE WHEN attempted_mcqs.selected_option=mcq_bank.correct_option THEN 1 ELSE 0 END) AS correct_count FROM attempted_mcqs INNER JOIN mcq_bank ON attempted_mcqs.mcq_id=mcq_bank.mcq_id INNER JOIN subjects ON subjects.subject_id=mcq_bank.subject_id WHERE student_id=$1 GROUP BY mcq_bank.subject_id, subjects.subject_name`, [userResult.student_id])).rows;
    subject_wise_mcq_counts.forEach(elem => {
        user[elem.subject_name.toLowerCase()].attempt = +elem.attempt_count;
        user[elem.subject_name.toLowerCase()].correct = +elem.correct_count;
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
});

const getMCQsForUser = async (req, res, next, query) => {
    const page = +req.query.page;
    const biology = req.query.biology ? +req.query.biology : 0;
    const physics = req.query.physics ? +req.query.physics : 0;
    const chemistry = req.query.chemistry ? +req.query.chemistry : 0;
    const english = req.query.english ? +req.query.english : 0;
    const logical_reasoning = req.query.logical_reasoning ? +req.query.logical_reasoning : 0;
    let search = req.query.search ?? "";
    let isError = false;
    const subjects = ["Biology", "Physics", "Chemistry", "English", "Logical Reasoning"];
    const selected_subjects = [];
    
    if (!Number.isInteger(page) || page <= 0 || !isString(search))
        return next(new AppError("Incorrect Query", 400));

    [biology, physics, chemistry, english, logical_reasoning]
    .forEach((flag) => {
        if (isError || !Number.isInteger(flag) || flag < 0 || flag > 1)
            return isError = true;
    });
    if (isError) return next(new AppError("Incorrect Query", 400));

    [biology, physics, chemistry, english, logical_reasoning]
    .forEach((flag, index) => {
        if (flag == 1)
            selected_subjects.push(subjects[index]);
    });
    search = search.split(",").map(word => `%${word}%`);
    const mcqs = (await pool.query(query, [req.user.student_id, SAVED_MCQS_PER_PAGE, (+page-1)*SAVED_MCQS_PER_PAGE, selected_subjects, search])).rows;
    
    res.status(200).json({
        status: "success",
        data: {
            count: mcqs.length,
            mcqs
        }
    });
};

export const getSavedMCQs = handleAsyncError(async (req, res, next) => {
    // /saved-mcqs?page=1&biology=1&physics=1&chemistry=1&english=1&logical_reasoning=1&search=umair,anwar
    const query = "SELECT subject_name, chapter_name, question, option_a, option_b, option_c, option_d, correct_option, explanation, saved_date::text FROM bookmarks INNER JOIN mcq_bank ON mcq_bank.mcq_id = bookmarks.mcq_id INNER JOIN subjects ON mcq_bank.subject_id = subjects.subject_id INNER JOIN chapters ON mcq_bank.chapter_id = chapters.chapter_id WHERE student_id=$1 AND subjects.subject_name = ANY ($4) AND mcq_bank.question ILIKE ANY($5) ORDER BY saved_date DESC LIMIT $2 OFFSET $3";
    return await getMCQsForUser(req, res, next, query); 
});

export const getWrongMCQs = handleAsyncError(async (req, res, next) => {
    // /wrong-mcqs?page=1&biology=1&physics=1&chemistry=1&english=1&logical_reasoning=1&search=umair,anwar&sort=(newest|oldest|hardest|most_attempted)
    let order_by;
    switch (req.query.sort) {
        case "oldest":
            order_by = "saved_date ASC"; break;
        case "most_attempted":
            order_by = "attempted_mcqs.attempt_count DESC"; break;
        case "hardest":
            order_by = "CASE mcq_bank.difficulty WHEN 'Hard' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Easy' THEN 3 END ASC"; break;
        default:
            order_by = "saved_date DESC";
    }
    const query = `SELECT subject_name, chapter_name, topic_name, question, option_a, option_b, option_c, option_d, correct_option, selected_option, explanation, difficulty, attempted_mcqs.attempt_count, saved_date::text FROM attempted_mcqs INNER JOIN mcq_bank ON mcq_bank.mcq_id = attempted_mcqs.mcq_id INNER JOIN subjects ON mcq_bank.subject_id = subjects.subject_id INNER JOIN chapters ON mcq_bank.chapter_id = chapters.chapter_id INNER JOIN topics ON mcq_bank.topic_id = topics.topic_id WHERE student_id=$1 AND subjects.subject_name = ANY ($4) AND mcq_bank.question ILIKE ANY($5) AND attempted_mcqs.selected_option != mcq_bank.correct_option ORDER BY ${order_by} LIMIT $2 OFFSET $3`;
    return await getMCQsForUser(req, res, next, query); 
});

export const submitQuiz = handleAsyncError(async (req, res, next) => {
/*
    body: {
        attempt_count,
        correct_count,
        streak,
        attempts: [ { id, selected_option } ]
    }
*/
    const {attempt_count, correct_count, streak} = req.body;
    const mcq_attempts = req.body.attempts;

    let today_activity = (await pool.query(`SELECT attempt_count, correct_count FROM activity WHERE student_id=$1 AND activity_date=$2::DATE`, [req.user.student_id, new Date()])).rows;
    if (today_activity.length == 0)
        await pool.query("INSERT INTO activity(student_id, attempt_count, correct_count, streak) VALUES ($1, $2, $3, $4)", [req.user.student_id, attempt_count, correct_count, streak]);
    else
        await pool.query("UPDATE activity SET attempt_count=$2, correct_count=$3, streak=$4 WHERE student_id=$1 AND activity_date=$5::DATE", [req.user.student_id, today_activity[0].attempt_count + attempt_count, today_activity[0].correct_count + correct_count, streak, new Date()]);

    await pool.query("INSERT INTO attempted_mcqs (student_id, mcq_id, selected_option) VALUES " + mcq_attempts.map(mcq => `(${req.user.student_id}, ${mcq.id}, '${mcq.selected_option}')`).join(", "));

    res.status(200).json({
        status: "success"
    });
})