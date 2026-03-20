import http from "node:http";
import { SqliteAdapter } from "bachelor/adapters/sqlite";

const PORT = 9090;
const adapter = new SqliteAdapter("recordings.db");

const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === "POST" && req.url === "/initial") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
            try {
                const initReq = JSON.parse(body);
                await adapter.HandleInitialRequestAsync(initReq);
                console.log(`Saved initial state for ${initReq.guid}`);
                res.writeHead(200);
                res.end("Ok");
            } catch (err) {
                console.error(err);
                res.writeHead(500);
                res.end("Error");
            }
        });
        return;
    }

    if (req.method === "POST" && req.url === "/in-progress") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
            try {
                const inProgReq = JSON.parse(body);
                await adapter.HandleInProgressRequestAsync(inProgReq);
                console.log(`Saved tick ${inProgReq.tick} for ${inProgReq.guid}`);
                res.writeHead(200);
                res.end("Ok");
            } catch (err) {
                console.error(err);
                res.writeHead(500);
                res.end("Error");
            }
        });
        return;
    }

    res.writeHead(404);
    res.end("Not found");
});

server.listen(PORT, () => {
    console.log(`Save server listening on http://localhost:${PORT}`);
});
