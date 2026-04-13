import pool from "../database.js";
import { AppError, handleAsyncError } from "../error.js";

export const getMcqDistributionPerTopic = handleAsyncError(async (req, res, next) => {
    const data = (await pool.query("SELECT topics.topic_id, topic_name, COUNT(mcq_bank.mcq_id)::INT FROM mcq_bank RIGHT JOIN topics ON mcq_bank.topic_id = topics.topic_id GROUP BY topics.topic_id, topics.topic_name")).rows;

    res.status(200).json({
        status: "success",
        data
    });
});

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
    let {easy, medium, hard} = req.query;
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