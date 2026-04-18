import pool from "./database.js";
import multer from "multer";
import { Readable } from "stream";
import { readSheet } from 'read-excel-file/node';

export const wait = (seconds) => new Promise((res) => setTimeout(res, seconds*1000));

export const isString = (str) => Object.prototype.toString.call(str) === '[object String]' && (str instanceof String || typeof str === 'string');

export const getSlug = (str) => str.toLowerCase().split(" ").join("-");

export const initialize = () => {
    process.env.MODE = process.env.MODE.trim();
}

export const readDataFromExcelFile = async (buffer) => {
    const data = await readSheet(Readable.from(buffer));
    const res = [];
    
    const formatColumnName = (name) => name.replaceAll(" ", "_").toLowerCase();
    
    data.forEach((row, index) => {
        if (index == 0) return;
        res.push({});
        data[index].forEach((value, j) => {
            res.at(-1)[formatColumnName(data[0][j])] = data[index][j];
        });
    });
    
    return res;
}

export const gracefulShutdown = (server) => {
    return async () => {
        try {
            server.close();
            await pool.end();
            console.log("Gracefully shutting down....");        
        } catch (err) {
            console.log("Ungracefully shutting down....");
            process.exit(-1);
        }
    }
}    

export const convertSubjectsChapterTopicsIntoNestedObject = (data) => {
    const subjects = ["Biology", "Chemistry", "Physics", "Logical Reasoning", "English"];
    const syllabus = [];    

    console.log(data);

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
                        syllabus.at(-1).chapters.at(-1).topics.push({
                            id: inner_elem.topic_id,
                            name: inner_elem.topic_name
                        });
                    }
                });
            }
        });
        if (syllabus.at(-1).chapters.length === 0) {
            syllabus.pop();
        }
    });
    return syllabus;
}

export const excelFileUpload = multer({storage: multer.memoryStorage(), fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        return cb(null, false);
    cb(null, true);
}});