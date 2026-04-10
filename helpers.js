export const wait = (seconds) => new Promise((res) => setTimeout(res, seconds*1000));

export const gracefulShutdown = async (server, pool) => {
    try {
        server.close();
        await pool.end();
        console.log("Gracefully shutting down....");        
    } catch (err) {
        console.log("Ungracefully shutting down....");
        process.exit(-1);
    }
}
