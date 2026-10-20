const express = require("express");
const http = require("http");
const os = require("os");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const LAMP_COUNT = 15;
const DATA_DIR = path.join(__dirname, "data");
const STATE_FILE = path.join(DATA_DIR, "lamp-state.json");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingTimeout: 10000, pingInterval: 5000 });

function blankState() {
  return {
    lamps: Array.from({ length: LAMP_COUNT }, () => false),
    lastChanged: new Date().toISOString(),
  };
}

function loadState() {
  try {
    const saved = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    if (Array.isArray(saved.lamps) && saved.lamps.length === LAMP_COUNT) {
      return { lamps: saved.lamps.map(Boolean), lastChanged: saved.lastChanged };
    }
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("Could not restore lamp state:", error.message);
  }
  return blankState();
}

let ceremony = loadState();
let saveTimer;

function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(ceremony, null, 2));
  }, 100);
}

function broadcastState(effect = null) {
  ceremony.lastChanged = new Date().toISOString();
  saveState();
  io.emit("ceremony:state", { ...ceremony, effect });
}

function validLamp(index) {
  return Number.isInteger(index) && index >= 0 && index < LAMP_COUNT;
}

function getLanAddress() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  return "localhost";
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

app.get("/api/info", async (_req, res) => {
  const host = getLanAddress();
  const baseUrl = `http://${host}:${PORT}`;
  const controlUrl = `${baseUrl}/control`;
  let qrCode = null;
  try {
    qrCode = await QRCode.toDataURL(controlUrl, {
      width: 360,
      margin: 2,
      color: { dark: "#34113d", light: "#fff8e7" },
    });
  } catch (error) {
    console.warn("Could not create controller QR code:", error.message);
  }
  res.json({ baseUrl, displayUrl: `${baseUrl}/display`, controlUrl, qrCode, lampCount: LAMP_COUNT });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, clients: io.engine.clientsCount, lit: ceremony.lamps.filter(Boolean).length });
});

io.on("connection", (socket) => {
  socket.emit("ceremony:state", ceremony);

  socket.on("lamp:ignite", (index) => {
    if (!validLamp(index) || ceremony.lamps[index]) return;
    ceremony.lamps[index] = true;
    broadcastState({ type: "ignite", index });
  });

  socket.on("lamp:extinguish", (index) => {
    if (!validLamp(index) || !ceremony.lamps[index]) return;
    ceremony.lamps[index] = false;
    broadcastState({ type: "extinguish", index });
  });

  socket.on("ceremony:next", () => {
    const index = ceremony.lamps.findIndex((lamp) => !lamp);
    if (index === -1) return;
    ceremony.lamps[index] = true;
    broadcastState({ type: "ignite", index });
  });

  socket.on("ceremony:all", () => {
    ceremony.lamps = ceremony.lamps.map(() => true);
    broadcastState({ type: "all" });
  });

  socket.on("ceremony:reset", () => {
    ceremony = blankState();
    broadcastState({ type: "reset" });
  });
});

server.listen(PORT, HOST, () => {
  const baseUrl = `http://${getLanAddress()}:${PORT}`;
  console.log("\nDigital Polthel Pahana is ready");
  console.log(`Setup:      ${baseUrl}`);
  console.log(`Display:    ${baseUrl}/display`);
  console.log(`Controller: ${baseUrl}/control\n`);
});

function shutdown() {
  clearTimeout(saveTimer);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(ceremony, null, 2));
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
