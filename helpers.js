import pool from "./database.js";
import { readSheet } from 'read-excel-file/node';
import { Readable } from "stream";

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