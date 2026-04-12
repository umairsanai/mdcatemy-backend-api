import dotenv from "dotenv";
import app from "./app.js";
import { initialize, gracefulShutdown } from "./helpers.js";
dotenv.config({path: "config.env"});
console.clear();

const server = app.listen(process.env.SERVER_PORT, process.env.SERVER_HOST, () => {
   console.log("Server started...."); 
});

initialize();


process.on('SIGTERM', gracefulShutdown(server));
process.on('SIGINT', gracefulShutdown(server));