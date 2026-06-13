import { createServer } from "node:http";
import { respond } from "./agent.mjs";

const PORT = Number(process.env.PORT) || 8787;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
};
const send = (res, code, obj) => {
  res.writeHead(code, { "Content-Type": "application/json", ...CORS });
  res.end(JSON.stringify(obj));
};

createServer((req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method === "GET" && req.url === "/health") return send(res, 200, { status: "ok" });

  if (req.method === "POST" && req.url === "/chat") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const { message, namespace, profileId, storePrediction, history } = JSON.parse(body || "{}");
        if (!message) return send(res, 400, { error: "message required" });
        const out = await respond({ userMessage: message, namespace, profileId, storePrediction, history });
        send(res, 200, out);
      } catch (e) {
        send(res, 500, { error: String(e?.message || e) });
      }
    });
    return;
  }
  send(res, 404, { error: "not found" });
}).listen(PORT, () => console.log(`pundit agent → http://localhost:${PORT}  (POST /chat, GET /health)`));
