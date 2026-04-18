import { handleAsyncError } from "../error.js";
import pool from "../database.js";
import { convertSubjectsChapterTopicsIntoNestedObject, getSlug, readDataFromExcelFile } from "../helpers.js";

export const getAllTests = handleAsyncError(async (req, res, next) => {
    let data = (await pool.query("SELECT test_name, slug, test_date, mcq_count, test_time, STRING_AGG(topic_name, ',') AS topics FROM tests INNER JOIN test_topics ON test_topics.test_id=tests.test_id INNER JOIN topics ON topics.topic_id=test_topics.topic_id GROUP BY test_name, slug, test_date, mcq_count, test_time")).rows;
    data = data.map(elem => {
        return {
            name: elem.test_name,
            slug: elem.slug,
            mcq_count: elem.mcq_count,
            time: elem.test_time,
            date: elem.test_date,
            topics: elem.topics.split(",")
        }
    });
    res.status(200).json({
        status: "success",
        data
    });
});

export const createTest = handleAsyncError(async (req, res, next) => {

    let {test_name, test_time, mcq_count, test_date, topics } = req.body;

    //  Create test
    await pool.query("INSERT INTO tests(test_name, slug, mcq_count, test_time, test_date) VALUES ($1, $2, $3, $4, $5::DATE)", [test_name, getSlug(test_name), +mcq_count, +test_time, test_date]);
    
    //  Insert topics
    const { test_id } = (await pool.query("SELECT test_id FROM tests WHERE slug=$1", [getSlug(test_name)])).rows[0];
    topics = topics.split(",").map(elem => +elem);
    await pool.query("INSERT INTO test_topics (test_id, topic_id) VALUES " + topics.map(topic_id => `(${test_id},${topic_id})`).join(", "));
        
    //  Insert enrollments
    let emails = (await readDataFromExcelFile(req.file.buffer)).map(elem => elem.email);
    let student_ids = (await pool.query("SELECT user_id FROM users WHERE email = ANY($1)", [emails])).rows.map(elem => elem.user_id);
    await pool.query("INSERT INTO test_enrollments (test_id, student_id) VALUES " + student_ids.map(student_id => `(${test_id},${student_id})`).join(", "));

    res.status(200).json({
        status: "success"
    });
});

export const editTest = handleAsyncError(async (req, res, next) => {
    
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
    const data = (await pool.query("SELECT DISTINCT subject_name, chapter_name, topic_name, topics.topic_id FROM test_mcqs INNER JOIN mcq_bank ON test_mcqs.mcq_id = mcq_bank.mcq_id INNER JOIN chapters ON mcq_bank.chapter_id = chapters.chapter_id INNER JOIN subjects ON mcq_bank.subject_id = subjects.subject_id INNER JOIN topics ON mcq_bank.topic_id = topics.topic_id WHERE test_id = (SELECT test_id FROM tests WHERE slug=$1)", [req.params.slug])).rows;
    const syllabus = convertSubjectsChapterTopicsIntoNestedObject(data);
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