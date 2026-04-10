import dotenv from "dotenv";
import app from "./app.js";
import pool from "./database.js";
import { gracefulShutdown } from "./helpers.js";
dotenv.config({path: "config.env"});
console.clear();

const server = app.listen(process.env.SERVER_PORT, process.env.SERVER_HOST, () => {
   console.log("Server started...."); 
});






process.on('SIGTERM', gracefulShutdown.bind(null, server, pool));
process.on('SIGINT', gracefulShutdown.bind(null, server, pool));