import { handleAsyncError } from "../error.js";
import pool from "../database.js";

export const getAllTestsNames = handleAsyncError(async (req, res, next) => {
    let data = (await pool.query("SELECT test_name AS name, slug FROM tests")).rows;
    res.status(200).json({
        status: "success",
        data
    });
});

export const addToTest = handleAsyncError(async (req, res, next) => {
    const { slug, mcq_id } = req.body;
    await pool.query("INSERT INTO test_mcqs (test_id, mcq_id) VALUES ((SELECT test_id FROM tests WHERE slug=$1), $2)", [slug, mcq_id]);
    res.status(200).json({
        status: "success"
    });
});

export const getUpcomingTest = handleAsyncError(async (req, res, next) => {

});

export const getAllTestStats = handleAsyncError(async (req, res, next) => {
    const result = (await pool.query("SELECT tests.test_id, tests.test_name, tests.slug, tests.test_date::TEXT, tests.mcq_count, SUM(CASE WHEN attempted_mcqs.selected_option = mcq_bank.correct_option THEN 1 ELSE 0 END)::INT AS correct, SUM(CASE WHEN attempted_mcqs.selected_option != mcq_bank.correct_option THEN 1 ELSE 0 END)::INT AS mistakes, SUM(CASE WHEN attempted_mcqs.selected_option IS NULL THEN 1 ELSE 0 END)::INT AS skipped FROM tests LEFT JOIN test_mcqs ON test_mcqs.test_id=tests.test_id LEFT JOIN mcq_bank ON mcq_bank.mcq_id = test_mcqs.mcq_id LEFT JOIN attempted_mcqs ON attempted_mcqs.mcq_id = mcq_bank.mcq_id AND attempted_mcqs.test_id = test_mcqs.test_id WHERE (attempted_mcqs.student_id=$1 OR attempted_mcqs.student_id IS NULL) AND tests.test_id IN (SELECT test_id FROM test_enrollments WHERE student_id=$1) GROUP BY tests.test_id, tests.test_name, tests.slug, tests.test_date, tests.mcq_count ORDER BY test_date DESC", [req.user.student_id])).rows;
    res.status(200).json({
        status: "success",
        data: result
    });
});

export const getTestInfo = handleAsyncError(async (req, res, next) => {    
    const data = (await pool.query(`SELECT DISTINCT subject_name, chapter_name, topic_name
        FROM test_mcqs 
        INNER JOIN mcq_bank ON test_mcqs.mcq_id = mcq_bank.mcq_id
        INNER JOIN chapters ON mcq_bank.chapter_id = chapters.chapter_id
        INNER JOIN subjects ON mcq_bank.subject_id = subjects.subject_id
        INNER JOIN topics ON mcq_bank.topic_id = topics.topic_id
        WHERE test_id = (SELECT test_id FROM tests WHERE slug=$1);
    `, [req.params.slug])).rows;

    const subjects = ["Biology", "Chemsitry", "Physics", "Logical Reasoning", "English"]
    const syllabus = [];    

    subjects.forEach(subject => {
        syllabus.push({
            subject,
            chapters: []
        });
        data.forEach(elem => {
            if (elem.subject_name === subject) {
                syllabus.at(-1).chapters.push({
                        name: elem.chapter_name,
                        topics: []
                });
                data.forEach(inner_elem => {
                    if (inner_elem.chapter_name === elem.chapter_name) {
                        syllabus.at(-1).chapters.at(-1).topics.push(inner_elem.topic_name);
                    }
                });
            }
        });
        if (syllabus.at(-1).chapters.length === 0) {
            syllabus.pop();
        }
    });

    const mcqs = (await pool.query("SELECT mcq_bank.mcq_id, question, option_a, option_b, option_c, option_d, selected_option, correct_option, subject_name FROM tests INNER JOIN test_mcqs ON test_mcqs.test_id = tests.test_id INNER JOIN mcq_bank ON mcq_bank.mcq_id = test_mcqs.mcq_id INNER JOIN subjects ON subjects.subject_id=mcq_bank.subject_id LEFT JOIN attempted_mcqs ON attempted_mcqs.mcq_id = mcq_bank.mcq_id AND attempted_mcqs.test_id = tests.test_id WHERE tests.slug = $2 AND attempted_mcqs.student_id=$1", [req.user.student_id, req.params.slug])).rows;
    let highest_score = (await pool.query("SELECT MAX(count)::INT AS max FROM ( SELECT SUM(CASE WHEN attempted_mcqs.selected_option = mcq_bank.correct_option THEN 1 ELSE 0 END) AS count FROM tests INNER JOIN test_mcqs ON test_mcqs.test_id = tests.test_id INNER JOIN mcq_bank ON mcq_bank.mcq_id = test_mcqs.mcq_id INNER JOIN attempted_mcqs ON attempted_mcqs.mcq_id = mcq_bank.mcq_id AND attempted_mcqs.test_id = tests.test_id WHERE tests.slug = $1 GROUP BY attempted_mcqs.student_id )", [req.params.slug])).rows;
    highest_score = highest_score.length === 0 ? null : highest_score[0].max;

    res.status(200).json({
        status: "success",
        data: {
            highest_score: highest_score,
            syllabus, 
            mcqs
        }
    });
});

export const submitTest = handleAsyncError(async (req, res, next) => {

});