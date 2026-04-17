import { readDataFromExcelFile } from "../helpers.js";
import { AppError, handleAsyncError } from "../error.js";

export const generateQuiz = handleAsyncError(async (req, res, next) => {
    /*
        query: ?easy=10&medium=5&hard=3
        body: {
            topic_ids: [1,2,3,....]  
        }
    */
    let quiz = {
        count: {
            easy: 0, medium: 0, hard: 0
        },
        mcqs: {
            easy: [], medium: [], hard: []
        }
    };

    let isError = false;    
    let {easy, medium, hard} = req.body;
    [easy, medium, hard] = [easy, medium, hard].map(elem => elem ? +elem : 0);

    [easy, medium, hard].forEach(count => {
        if (isError || !Number.isInteger(count) || count < 0)
            return isError = true;
    });
    if (isError || !req.body.topic_ids || !Array.isArray(req.body.topic_ids)) 
        return next(new AppError("Incorrect Query", 400));

    let query = "SELECT mcq_bank.mcq_id, topic_id, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, subject_name, chapter_name, (CASE WHEN bookmarks.mcq_id IS NOT NULL THEN 1 ELSE 0 END) AS is_bookmarked FROM mcq_bank INNER JOIN subjects ON subjects.subject_id = mcq_bank.subject_id INNER JOIN chapters ON chapters.chapter_id = mcq_bank.chapter_id LEFT JOIN bookmarks ON bookmarks.mcq_id=mcq_bank.mcq_id AND bookmarks.student_id=$1 WHERE difficulty='<<diff>>' AND topic_id = ANY($3) ORDER BY RANDOM() LIMIT $2";

    if (easy) {
        query = query.replace("<<diff>>", "Easy")
        quiz.mcqs.easy = (await pool.query(query, [req.user.student_id ?? -1, easy, req.body.topic_ids])).rows;
    }
    if (medium) {
        query = query.replace("Easy", "Medium")
        quiz.mcqs.medium = (await pool.query(query, [req.user.student_id ?? -1, medium, req.body.topic_ids])).rows;
    }
    if (hard) {
        query = query.replace("<<diff>>", "Hard")
        quiz.mcqs.hard = (await pool.query(query, [req.user.student_id ?? -1, hard, req.body.topic_ids])).rows;
    }

    quiz.count.easy = quiz.mcqs.easy.length;
    quiz.count.medium = quiz.mcqs.medium.length;
    quiz.count.hard = quiz.mcqs.hard.length;

    res.status(200).json({
        status: "success",
        data: quiz
    });
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
});

export const getAllQuizNamesForUser = handleAsyncError(async (req, res, next) => {

});
