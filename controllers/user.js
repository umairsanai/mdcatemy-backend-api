import pool from "../database.js";
import { AppError, handleAsyncError } from "../error.js";
import { isString } from "../helpers.js";

const SAVED_MCQS_PER_PAGE = 10;
const MILLISECONDS_IN_DAY = 86400000;

export const getDashboardStats = handleAsyncError(async (req, res, next) => {

    let user = {
        name: req.user.name,
        email: req.user.email,
        streak: 0,
        today_attempt_count: 0,
        total_attempt_count: 0,
        total_correct_count: 0,
        saved_mcqs_count: 0,
        total_mistakes: req.user.total_mistakes,
        pending_mistakes: 0,
        biology: { attempt: 0, correct: 0, bookmarks: 0 },
        chemistry: { attempt: 0, correct: 0, bookmarks: 0 },
        physics: { attempt: 0, correct: 0, bookmarks: 0 },
        english: { attempt: 0, correct: 0, bookmarks: 0 },
        logical_reasoning: { attempt: 0, correct: 0, bookmarks: 0 }
    };
    

    const yesterday = new Date(Date.now()-1*MILLISECONDS_IN_DAY).toISOString().split('T')[0];
    let yesterday_activity = (await pool.query(`SELECT streak, attempt_count, activity_date::text FROM activity WHERE student_id=$1 AND activity_date=$2::DATE`, [req.user.student_id, yesterday])).rows[0];

    if ((!yesterday_activity || yesterday_activity.attempt_count < 50) && req.user.streak != 0) {
        await pool.query("UPDATE students SET streak=0 WHERE student_id=$1", [req.user.student_id]);
    } else if (yesterday_activity && yesterday_activity.attempt_count >= 50 && +yesterday_activity.streak === req.user.streak) {
        user.streak = req.user.streak+1;
        await pool.query("UPDATE students SET streak=$1 WHERE student_id=$2", [req.user.streak+1, req.user.student_id]);
    } else if (yesterday_activity && yesterday_activity.attempt_count >= 50) {
        user.streak = req.user.streak;
    }

    const today_acitivity = (await pool.query(`SELECT attempt_count FROM activity WHERE student_id=$1 AND activity_date=$2::DATE`, [req.user.student_id, new Date()])).rows[0];
    if (today_acitivity) {
        user.today_attempt_count = +today_acitivity.attempt_count;
    }

    const subject_wise_mcq_counts = (await pool.query(`SELECT subjects.subject_name, SUM(1) AS attempt_count, SUM(CASE WHEN attempted_mcqs.selected_option=mcq_bank.correct_option THEN 1 ELSE 0 END) AS correct_count FROM attempted_mcqs INNER JOIN mcq_bank ON attempted_mcqs.mcq_id=mcq_bank.mcq_id INNER JOIN subjects ON subjects.subject_id=mcq_bank.subject_id WHERE student_id=$1 GROUP BY mcq_bank.subject_id, subjects.subject_name`, [req.user.student_id])).rows;
    const subject_wise_saved_mcq_counts = (await pool.query("SELECT subjects.subject_name, COUNT(subjects.subject_name)::INT AS count FROM bookmarks INNER JOIN mcq_bank ON bookmarks.mcq_id=mcq_bank.mcq_id INNER JOIN subjects ON subjects.subject_id=mcq_bank.subject_id WHERE student_id=$1 GROUP BY subjects.subject_name", [req.user.student_id])).rows;
    subject_wise_mcq_counts.forEach(elem => {
        user[elem.subject_name.toLowerCase()].attempt = +elem.attempt_count;
        user[elem.subject_name.toLowerCase()].correct = +elem.correct_count;
    });
    subject_wise_saved_mcq_counts.forEach((elem) => {
        user[elem.subject_name.toLowerCase()].bookmarks = +elem.count;        
    });

    user.total_correct_count = user.biology.correct + user.chemistry.correct + user.physics.correct + user.english.correct + user.logical_reasoning.correct;
    user.total_attempt_count = user.biology.attempt + user.chemistry.attempt + user.physics.attempt + user.english.attempt + user.logical_reasoning.attempt;
    user.pending_mistakes = user.total_attempt_count - user.total_correct_count;
    user.accuracy = !user.total_attempt_count ? 0 : Math.round((user.total_correct_count/user.total_attempt_count)*100);

    user.activity = (await pool.query(`SELECT attempt_count, correct_count, activity_date::text FROM activity WHERE student_id=$1 AND activity_date >= $2::DATE`, [req.user.student_id, new Date(Date.now()-7*MILLISECONDS_IN_DAY)])).rows;
    user.weak_topics = (await pool.query(`SELECT topics.topic_name, chapters.chapter_name, subjects.subject_name, ROUND(SUM(CASE WHEN outer_attempted_mcqs.selected_option=outer_mcq_bank.correct_option THEN 1 ELSE 0 END)*100 / (COUNT(*))) AS accuracy FROM attempted_mcqs outer_attempted_mcqs INNER JOIN mcq_bank outer_mcq_bank ON outer_mcq_bank.mcq_id=outer_attempted_mcqs.mcq_id INNER JOIN topics ON outer_mcq_bank.topic_id=topics.topic_id INNER JOIN chapters ON outer_mcq_bank.chapter_id=chapters.chapter_id INNER JOIN subjects ON outer_mcq_bank.subject_id=subjects.subject_id WHERE outer_attempted_mcqs.student_id=$1 GROUP BY outer_mcq_bank.topic_id, topic_name, chapter_name, subject_name ORDER BY accuracy ASC LIMIT 4`, [req.user.student_id])).rows;

    res.status(200).json({
        status: "success",
        data: user 
    });
});

const getMCQsForUser = async (req, res, next, query) => {
    let {page, biology, physics, chemistry, english, logical_reasoning} = req.query;
    let search = req.query.search ?? "";
    let isError = false;
    const subjects = ["Biology", "Physics", "Chemistry", "English", "Logical Reasoning"];
    const selected_subjects = [];
    [page, biology, physics, chemistry, english, logical_reasoning] = 
    [page, biology, physics, chemistry, english, logical_reasoning].map(elem => elem ? +elem : 0);

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
    const query = "SELECT mcq_bank.mcq_id, subject_name, chapter_name, question, option_a, option_b, option_c, option_d, correct_option, explanation, saved_date::text FROM bookmarks INNER JOIN mcq_bank ON mcq_bank.mcq_id = bookmarks.mcq_id INNER JOIN subjects ON mcq_bank.subject_id = subjects.subject_id INNER JOIN chapters ON mcq_bank.chapter_id = chapters.chapter_id WHERE student_id=$1 AND subjects.subject_name = ANY ($4) AND mcq_bank.question ILIKE ANY($5) ORDER BY saved_date DESC LIMIT $2 OFFSET $3";
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
    const query = `SELECT mcq_bank.mcq_id, subject_name, chapter_name, topic_name, question, option_a, option_b, option_c, option_d, correct_option, selected_option, explanation, difficulty, attempted_mcqs.attempt_count, saved_date::text FROM attempted_mcqs INNER JOIN mcq_bank ON mcq_bank.mcq_id = attempted_mcqs.mcq_id INNER JOIN subjects ON mcq_bank.subject_id = subjects.subject_id INNER JOIN chapters ON mcq_bank.chapter_id = chapters.chapter_id INNER JOIN topics ON mcq_bank.topic_id = topics.topic_id WHERE student_id=$1 AND subjects.subject_name = ANY ($4) AND mcq_bank.question ILIKE ANY($5) AND attempted_mcqs.selected_option != mcq_bank.correct_option ORDER BY ${order_by} LIMIT $2 OFFSET $3`;
    return await getMCQsForUser(req, res, next, query); 
});

export const deleteSavedMCQ = handleAsyncError(async (req, res, next) => {
    if (!req.params.mcq_id || !Number.isInteger(+req.params.mcq_id)) 
        return next(new AppError("Incorrect Query", 400));

    await pool.query("DELETE FROM bookmarks WHERE student_id=$1 AND mcq_id=$2", [+req.user.student_id, +req.params.mcq_id]);

    res.status(200).json({
        status: "success"
    });
});

export const deleteWrongMCQ = handleAsyncError(async (req, res, next) => {
    if (!req.params.mcq_id || !Number.isInteger(+req.params.mcq_id)) 
        return next(new AppError("Incorrect Query", 400));

    await pool.query("UPDATE attempted_mcqs SET selected_option=(SELECT correct_option FROM mcq_bank WHERE mcq_id=$2) WHERE student_id=$1 AND mcq_id=$2", [+req.user.student_id, +req.params.mcq_id]);

    res.status(200).json({
        status: "success"
    });
});

export const uploadPaymentReceipt = handleAsyncError(async (req, res, next) => {
    (await pool.query("UPDATE students SET payment_status='PENDING' WHERE student_id=$1", [req.user.student_id]));
    res.status(200).json({
        status: "success",
        payment_status: "PENDING"
    });
});