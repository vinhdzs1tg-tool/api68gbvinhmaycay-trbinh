const express = require("express");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { generatePrediction } = require("./predictionAlgorithms.js");

const app = express();
const PORT = process.env.PORT || 3000;

function parseFromData(rawData) {
  try {
    const sessionMatch = rawData.match(/#(\d+)/);
    const diceMatch = rawData.match(/\{(\d+)-(\d+)-(\d+)\}/);

    if (!sessionMatch || !diceMatch) return null;

    const Phien = parseInt(sessionMatch[1]);
    const dice1 = parseInt(diceMatch[1]);
    const dice2 = parseInt(diceMatch[2]);
    const dice3 = parseInt(diceMatch[3]);
    const total = dice1 + dice2 + dice3;
    const ket_qua = total >= 11 ? "Tài" : "Xỉu";

    return { Phien, Xuc_xac_1: dice1, Xuc_xac_2: dice2, Xuc_xac_3: dice3, Tong: total, Ket_qua: ket_qua };
  } catch (e) {
    console.error("❌ Parse error:", e);
    return null;
  }
}

app.get("/predict", async (req, res) => {
  try {
    const response = await fetch("https://bcrapi-default-rtdb.firebaseio.com/taixiu_sessions.json");
    const data = await response.json();

    const history = Object.values(data);
    const lastSession = history[history.length - 1];

    let formatted = null;
    if (lastSession.Phien) {
      formatted = {
        Phien: lastSession.Phien,
        Xuc_xac_1: lastSession.Xuc_xac_1 || lastSession.xuc_xac_1,
        Xuc_xac_2: lastSession.Xuc_xac_2 || lastSession.xuc_xac_2,
        Xuc_xac_3: lastSession.Xuc_xac_3 || lastSession.xuc_xac_3,
        Tong: lastSession.Tong || lastSession.tong,
        Ket_qua: lastSession.Ket_qua || lastSession.ket_qua
      };
    } else if (lastSession.data) {
      formatted = parseFromData(lastSession.data);
    }

    if (!formatted) {
      return res.status(400).json({ status: "error", message: "Không parse được dữ liệu phiên gần nhất" });
    }

    const prediction = generatePrediction(history, {});

    res.json({
      Phien: formatted.Phien,
      Xuc_xac_1: formatted.Xuc_xac_1,
      Xuc_xac_2: formatted.Xuc_xac_2,
      Xuc_xac_3: formatted.Xuc_xac_3,
      Tong: formatted.Tong,
      Ket_qua: formatted.Ket_qua,
      Phien_hien_tai: formatted.Phien + 1,
      Du_doan: prediction
    });
  } catch (error) {
    console.error("❌ API Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ API server running at http://localhost:${PORT}/predict`);
});
