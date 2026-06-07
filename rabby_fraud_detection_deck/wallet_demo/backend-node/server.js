import cors from "cors";
import express from "express";
import { scoreTransaction } from "./src/riskEngine.js";
import { simulateTransaction } from "./src/simulationEngine.js";
import { getThreatFeed } from "./src/threatIntelligence.js";

const app = express();
const port = process.env.PORT || 4100;

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "ChainShield Node Risk Engine" });
});

app.post("/api/risk/score", (request, response) => {
  response.json(scoreTransaction(request.body));
});

app.post("/api/transaction/simulate", (request, response) => {
  const risk = scoreTransaction(request.body);
  response.json({ risk, simulation: simulateTransaction(request.body, risk) });
});

app.get("/api/threats", (_request, response) => {
  response.json({ threats: getThreatFeed() });
});

app.listen(port, () => {
  console.log(`ChainShield Node Risk Engine running on port ${port}`);
});
