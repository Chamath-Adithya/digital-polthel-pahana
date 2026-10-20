const socket = io({ reconnection: true, reconnectionDelay: 500, reconnectionDelayMax: 3000 });

window.Pahana = {
  socket,
  onState(callback) {
    socket.on("ceremony:state", callback);
  },
  ignite(index) {
    socket.emit("lamp:ignite", index);
  },
  extinguish(index) {
    socket.emit("lamp:extinguish", index);
  },
  next() {
    socket.emit("ceremony:next");
  },
  lightAll() {
    socket.emit("ceremony:all");
  },
  reset() {
    socket.emit("ceremony:reset");
  },
  connectionBadge(element) {
    function render(connected) {
      element.classList.toggle("is-online", connected);
      element.classList.toggle("is-offline", !connected);
      element.querySelector("span:last-child").textContent = connected ? "Connected" : "Reconnecting…";
    }
    socket.on("connect", () => render(true));
    socket.on("disconnect", () => render(false));
    render(socket.connected);
  },
};

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
