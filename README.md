# Digital Polthel Pahana — Rāwa 26

A complete local-network ceremony system with a fullscreen projector display and a touch-friendly tablet controller for 15 virtual oil lamps. The display uses a custom lotus-inspired ceremonial tree composition with curved brass tiers, layered flames, blue flame cores, glow, sparks, smoke, and a full-light finale. Its “Voice Aura” links the visual to the dubbing theme: every ignition releases a golden sound-wave ripple, while a subtle central frequency halo grows with the number of illuminated lamps.

## Quick start (event day)

1. Connect the event computer and tablet to the **same Wi-Fi network**.
2. Double-click `START-EVENT.sh` and choose **Run in Terminal**. Alternatively, open a terminal in this folder and run `npm start`.
3. Open the **Setup** address printed in the terminal (normally `http://<computer-ip>:3000`).
4. On the computer/projector, click **Open Main Display**, then **Begin Ceremony Display**.
5. On the tablet, scan the QR code shown on the Setup page.
6. Use **Next in Sequence** or one of the 15 numbered buttons to light a pahana.

Keep the terminal window open for the entire ceremony. To stop the system, press `Ctrl+C` in that terminal.

## Non-technical Windows client

Download the Windows release ZIP, extract it, and double-click `Digital-Polthel-Pahana.exe`. Node.js, npm, and installation are not required. The Setup page opens automatically. On the first launch, approve the Windows administrator prompt that creates a firewall rule restricted to devices on the same local network. The unsigned event build may also show Windows SmartScreen; choose **More info → Run anyway**.

Build the standalone Windows x64 executable from source with `npm run build:windows`. The generated EXE embeds the complete web app and all visual assets.

## Controller safety

- A numbered button can only light its pahana once.
- **Light All** and **Reset** require a 1.5-second hold to prevent accidental activation.
- Current lamp state is saved automatically. If the server restarts, the ceremony returns to its last state.
- If Wi-Fi briefly drops, both screens reconnect automatically.

## Dress rehearsal checklist

- Set the projector/computer display to **1920 × 1080** where possible.
- Turn off computer sleep, screen lock, and notification popups.
- Test the QR code from the exact Wi-Fi network used at the event.
- Confirm the tablet shows **Connected** before the ceremony begins.
- Test Pahana 01, then hold **Reset** before guests arrive.
- Keep the computer connected to power.
- Have a second browser tab open on `/control` as an emergency backup controller.

## Useful addresses

- `/` — setup and QR code
- `/display` — fullscreen projector screen
- `/control` — tablet control panel
- `/api/health` — system health check

## Project files

```text
digital-polthel-pahana/
├── public/
│   ├── assets/          Custom event backdrop and supplied logo
│   ├── display.html     Projector display
│   ├── control.html     Tablet controller
│   ├── index.html       Setup screen and QR code
│   ├── styles.css       Visual design and lamp animations
│   ├── display.js       Display state, sound, and finale
│   ├── control.js       Tablet controls and safety holds
│   └── app.js           Realtime connection helper
├── data/                Automatically saved ceremony state
├── server.js            Local web and realtime server
├── START-EVENT.sh       One-click Linux launcher
└── package.json
```

## Troubleshooting

**Tablet cannot open the controller:** verify both devices use the same Wi-Fi. Some university/guest Wi-Fi networks block communication between devices; use a private router or phone hotspot in that case.

**Display says “Reconnecting”:** make sure the terminal running the server is still open, then refresh the display.

**Need to restart from zero:** open the controller and hold **Reset** for 1.5 seconds.

**QR address changed:** restarting the server after changing Wi-Fi automatically creates a new QR code.

## Asset note

The ceremonial hall illustration was generated specifically for this project using the event images as mood and palette references. The Rāwa 26 logo is derived from the image supplied for this project.
