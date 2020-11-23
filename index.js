const path = require('path');
const os = require('os');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');

const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const slash = require('slash');
const log = require('electron-log');

process.env.NODE_ENV = 'production';

const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

let mainWindow;
let aboutWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'ImageShrink',
    width: isDev ? 800 : 500,
    height: 600,
    resizable: isDev,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.loadFile('./app/index.html');
}

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    title: 'About ImageShrink',
    width: 300,
    height: 300,
    resizable: false,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  aboutWindow.loadFile('./app/about.html');
}

app.on('ready', () => {
  createMainWindow();

  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  mainWindow.on('ready', () => {
    mainWindow = null;
  });
});

const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: 'About',
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    label: 'File',
    submenu: [
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => app.quit(),
      },
    ],
  },
  ...(!isMac
    ? [
        {
          label: 'Help',
          submenu: [
            {
              label: 'About',
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  ...(isDev
    ? [
        {
          label: 'Developer',
          submenu: [
            {
              role: 'reload',
            },
            {
              role: 'forcereload',
            },
            {
              type: 'separator',
            },
            {
              role: 'toggledevtools',
            },
          ],
        },
      ]
    : []),
];

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.etAllWindows().length === 0) {
    createMainWindow();
  }
});

ipcMain.on('image:minimize', async (e, options) => {
  options.dest = path.join(os.homedir(), 'imageShrink');
  await shrinkImage(options);
});

async function shrinkImage({ dest, quality, imgPath }) {
  try {
    const pgnQuality = quality / 100;
    await imagemin([slash(imgPath)], {
      destination: dest,
      plugins: [
        imageminMozjpeg({
          quality,
        }),
        imageminPngquant({
          quality: [pgnQuality, pgnQuality],
        }),
      ],
    });

    shell.openPath(dest);
    mainWindow.webContents.send('image:done');
  } catch (error) {
    log.error(error);
  }
}
