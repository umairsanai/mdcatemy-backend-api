import pool from "../database.js";
import { readDataFromExcelFile } from "../helpers.js";
import { AppError, handleAsyncError } from "../error.js";
import { convertSubjectsChapterTopicsIntoNestedObject } from "../helpers.js";

export const getMcqDistributionPerTopic = handleAsyncError(async (req, res, next) => {
    const data = (await pool.query("SELECT topics.topic_id, topic_name, COUNT(mcq_bank.mcq_id)::INT FROM mcq_bank RIGHT JOIN topics ON mcq_bank.topic_id = topics.topic_id GROUP BY topics.topic_id, topics.topic_name")).rows;

    res.status(200).json({
        status: "success",
        data
    });
});

export const uploadMCQs = handleAsyncError(async (req, res, next) => {
    if (!req.file)
        return next(new AppError("No file uploaded.", 400));

    const data = await readDataFromExcelFile(req.file.buffer);
    console.log(data);

    // TODO: Save mcqs in the database.

    res.status(200).json({
        status: "success"
    });
});


export const getAllTopics = handleAsyncError(async (req, res, next) => {
    let data = (await pool.query("SELECT DISTINCT subject_name, chapter_name, topic_name, mcq_bank.topic_id FROM mcq_bank INNER JOIN subjects ON subjects.subject_id=mcq_bank.subject_id INNER JOIN chapters ON chapters.chapter_id=mcq_bank.chapter_id INNER JOIN topics ON topics.topic_id=mcq_bank.topic_id")).rows;
    data = convertSubjectsChapterTopicsIntoNestedObject(data);
    res.status(200).json({
        status: "success",
        data
    });
});