// Windows desktop wrapper: opens the built game (dist/) in its own window. No network, no Node in the page.
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

function open() {
  const win = new BrowserWindow({
    width: 540,
    height: 920,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: '#14171c',
    autoHideMenuBar: true,
    title: 'Good Time',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  // The epilogue cites its sources as links: open those in the system browser, never inside the game window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (/^https?:/.test(url)) { e.preventDefault(); shell.openExternal(url); }
  });
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(open);
app.on('window-all-closed', () => app.quit());
