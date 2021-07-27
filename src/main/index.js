const {
    BrowserWindow,
    dialog
} = require("electron");
const process = require("process");
const url = require("url");
const path = require("path");
const { host, port } = require('@config/index.js');

const devMode = process.env.NODE_ENV === "development";
let mainWindow = null;

//创建窗口
function createWindow() {
    // 首页路径，file协议,pathToFileURL得到编码过的URL
    // url.pathToFileURL:NodeJs v10.12.0，低版本可用url.format代替
    const filePath = url.pathToFileURL(path.join(__dirname, 'index.html')).href;
    const indexUrl = `http://${host}:${port}/`;

    let config = {
        title: "recorder-electron-vue",
        width: 1240,
        height: 730,
        minWidth: 1240,
        minHeight: 730,
        show: true,
        center: true,
        simpleFullscreen: true,
        resizable: process.platform === 'darwin',
        movable: true, //可否移动
        minimizable: true, //可否最小化
        maximizable: true, //可否最大化
        fullscreen: false, //MAC下是否可以全屏
        skipTaskbar: false, //在任务栏中显示窗口
        acceptFirstMouse: true, //是否允许单击页面来激活窗口
        closable: true,
        backgroundColor: '#fff',
        allowRunningInsecureContent: true,//允许一个 https 页面运行 http url 里的资源
        webPreferences: {
            devTools: true, //是否打开调试模式
            webSecurity: false,//禁用安全策略
            allowDisplayingInsecureContent: true,//允许一个使用 https的界面来展示由 http URLs 传过来的资源
            allowRunningInsecureContent: true, //允许一个 https 页面运行 http url 里的资源
            nodeIntegration: true//5.x以上版本，默认无法在渲染进程引入node模块，需要这里设置为true
        }
    };
    mainWindow = new BrowserWindow(config);
    // 开发环境使用http协议，生产环境使用file协议
    mainWindow.loadURL(devMode ? encodeURI(indexUrl) : filePath);
    //监听关闭
    mainWindow.on('closed', function () {
        mainWindow = null;
    }).on('close', function () {
        console.log('close');
        // 其他处理
    }).on('ready-to-show', function () {
        mainWindow.show();
    });

    try {
        if (mainWindow.webContents.debugger.isAttached()) mainWindow.webContents.debugger.detach("1.1");
        mainWindow.webContents.debugger.attach("1.1");
        mainWindow.webContents.debugger.sendCommand("Network.enable");
    } catch (err) {
        console.log("无法启动调试", err);
        dialog.showErrorBox("get", "无法启动调试");
    }
    return mainWindow;
}
module.exports = {
    create(_callback) {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.destroy();
        }
        mainWindow = createWindow();
        if (_callback instanceof Function) _callback(mainWindow);
        return mainWindow;
    }
}
