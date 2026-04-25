import http from "node:http";
import { SqliteAdapter } from "bachelor/adapters/sqlite";
import { getNextState } from "./game-engine.js";

const PORT = 9090;
const adapter = new SqliteAdapter("recordings.db");

const server = http.createServer(async (req, res) => {
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

    if (req.method === "GET" && req.url?.startsWith("/replay")) {
        const params = new URL(req.url, `http://localhost:${PORT}`).searchParams;
        const guid = params.get("guid");
        if (!guid) {
            res.writeHead(400);
            res.end("Missing guid parameter");
            return;
        }
        const stop = params.has("stop") ? parseInt(params.get("stop")!, 10) : undefined;
        try {
            const game = await adapter.GetStoredGame(guid);
            let state = game.initial;
            const inputs = game.inputs;
            const limit = stop !== undefined ? Math.min(stop, inputs.length) : inputs.length;
            for (let i = 0; i < limit; i++) {
                state = getNextState(state, inputs[i]);
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ state, inputsApplied: limit, inputsTotal: inputs.length }));
        } catch (err) {
            console.error(err);
            res.writeHead(404);
            res.end("Session not found");
        }
        return;
    }

    if (req.method === "GET" && req.url === "/sessions") {
        try {
            const sessions = adapter.GetSessions();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(sessions));
        } catch (err) {
            console.error(err);
            res.writeHead(500);
            res.end("Error");
        }
        return;
    }

    if (req.method === "GET" && req.url?.startsWith("/session")) {
        const guid = new URL(req.url, `http://localhost:${PORT}`).searchParams.get("guid");
        if (!guid) {
            res.writeHead(400);
            res.end("Missing guid parameter");
            return;
        }
        try {
            const game = await adapter.GetStoredGame(guid);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(game));
        } catch (err) {
            console.error(err);
            res.writeHead(404);
            res.end("Session not found");
        }
        return;
    }

    res.writeHead(404);
    res.end("Not found");
});

server.listen(PORT, () => {
    console.log(`Save server listening on http://localhost:${PORT}`);
});
