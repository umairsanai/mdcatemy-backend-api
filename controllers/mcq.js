import pool from "../database.js";
import { AppError, handleAsyncError } from "../error.js";

export const getMcqDistributionPerTopic = handleAsyncError(async (req, res, next) => {
    const data = (await pool.query("SELECT topic_name, COUNT(*)::INT FROM mcq_bank INNER JOIN topics ON mcq_bank.topic_id = topics.topic_id GROUP BY topics.topic_name")).rows;

    res.status(200).json({
        status: "success",
        data
    });
});

export const generateQuiz = handleAsyncError(async (req, res, next) => {
    let quiz = {
        count: {
            easy: 0,
            medium: 0,
            hard: 0
        },
        mcqs: {
            easy: [],
            medium: [],
            hard: []
        }
    };
    let {easy, medium, hard} = req.query;

    if (!easy) easy = 0;
    if (!medium) medium = 0;
    if (!hard) hard = 0;

    if (easy)
        quiz.mcqs.easy = (await pool.query("SELECT question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, subject_name, chapter_name FROM mcq_bank INNER JOIN subjects ON subjects.subject_id = mcq_bank.subject_id INNER JOIN chapters ON chapters.chapter_id = mcq_bank.chapter_id WHERE difficulty='Easy' ORDER BY RANDOM() LIMIT $1", [easy])).rows;
    if (medium)
        quiz.mcqs.medium = (await pool.query("SELECT question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, subject_name, chapter_name FROM mcq_bank INNER JOIN subjects ON subjects.subject_id = mcq_bank.subject_id INNER JOIN chapters ON chapters.chapter_id = mcq_bank.chapter_id WHERE difficulty='Medium' ORDER BY RANDOM() LIMIT $1", [medium])).rows;
    if (hard)
        quiz.mcqs.hard = (await pool.query("SELECT question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, subject_name, chapter_name FROM mcq_bank INNER JOIN subjects ON subjects.subject_id = mcq_bank.subject_id INNER JOIN chapters ON chapters.chapter_id = mcq_bank.chapter_id WHERE difficulty='Hard' ORDER BY RANDOM() LIMIT $1", [hard])).rows;

    quiz.count.easy = quiz.mcqs.easy.length;
    quiz.count.medium = quiz.mcqs.medium.length;
    quiz.count.hard = quiz.mcqs.hard.length;

    res.status(200).json({
        status: "success",
        data: quiz
    });
});