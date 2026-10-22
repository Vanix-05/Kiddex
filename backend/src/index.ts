import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Welcome to the KIDDEX API!" });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    application: "KIDDEX",
  });
});

app.listen(PORT, () => {
  console.log(`KIDDEX API running at http://localhost:${PORT}`);
});