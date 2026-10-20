const express = require("express");
const http = require("http");
const os = require("os");
const path = require("path");
const fs = require("fs");
const { execFileSync, spawn, spawnSync } = require("child_process");
const QRCode = require("qrcode");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const LAMP_COUNT = 15;
const IS_PACKAGED = Boolean(process.pkg);
const DATA_DIR = IS_PACKAGED
  ? path.join(process.env.APPDATA || path.dirname(process.execPath), "DigitalPolthelPahana")
  : path.join(__dirname, "data");
const STATE_FILE = path.join(DATA_DIR, "lamp-state.json");
const PUBLIC_DIR = path.join(__dirname, "public");

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

function defaultWindowsLanAddress() {
  if (process.platform !== "win32") return null;
  try {
    const script = [
      "$route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric, InterfaceMetric | Select-Object -First 1",
      "$ip = Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1",
      "$ip.IPAddress",
    ].join("; ");
    const address = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
    }).trim();
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(address) ? address : null;
  } catch (_) {
    return null;
  }
}

function getLanAddress() {
  const routedAddress = defaultWindowsLanAddress();
  if (routedAddress) return routedAddress;

  const candidates = [];
  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family !== "IPv4" || address.internal || address.address.startsWith("169.254.")) continue;
      const normalizedName = name.toLowerCase();
      let score = 0;
      if (/wi-?fi|wlan|wireless|ethernet|eth/.test(normalizedName)) score += 20;
      if (/vethernet|virtual|vmware|virtualbox|docker|wsl|loopback|bridge/.test(normalizedName)) score -= 40;
      if (/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(address.address)) score += 10;
      candidates.push({ address: address.address, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.address || "localhost";
}

function ensureWindowsFirewallAccess() {
  if (!IS_PACKAGED || process.platform !== "win32") return;

  const ruleName = "Digital Polthel Pahana (Same Network)";
  const existing = spawnSync("netsh.exe", ["advfirewall", "firewall", "show", "rule", `name=${ruleName}`], {
    windowsHide: true,
    stdio: "ignore",
  });
  if (existing.status === 0) return;

  console.log("Windows may ask for permission so the tablet can connect.");
  const firewallArguments = [
    "advfirewall",
    "firewall",
    "add",
    "rule",
    `name=${ruleName}`,
    "dir=in",
    "action=allow",
    "protocol=TCP",
    `localport=${PORT}`,
    "remoteip=localsubnet",
    "profile=any",
  ];
  const quotedArguments = firewallArguments.map((argument) => `'${argument.replaceAll("'", "''")}'`).join(",");
  const powerShell = `$arguments = @(${quotedArguments}); Start-Process -FilePath 'netsh.exe' -ArgumentList $arguments -Verb RunAs -Wait`;
  const elevated = spawn("powershell.exe", ["-NoProfile", "-Command", powerShell], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  elevated.unref();
}

app.use(express.json());
app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

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

  if (IS_PACKAGED) {
    ensureWindowsFirewallAccess();
    setTimeout(() => {
      const localUrl = `http://127.0.0.1:${PORT}`;
      const opener = process.platform === "win32"
        ? spawn("cmd", ["/c", "start", "", localUrl], { detached: true, stdio: "ignore", windowsHide: true })
        : spawn("xdg-open", [localUrl], { detached: true, stdio: "ignore" });
      opener.unref();
    }, 900);
  }
});

function shutdown() {
  clearTimeout(saveTimer);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(ceremony, null, 2));
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
