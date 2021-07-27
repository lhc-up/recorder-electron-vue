// 单实例检查，禁止同时打开多个客户端
require("./libs/runCheck.js")();
// 注册快捷键,同时按下F1+F2+F3，打开控制台
const shortcut = require("./libs/shortcut.js");
const {
    app,
    BrowserWindow,
} = require("electron");

// 主窗口
const indexWin = require('./index.js');

// (electron) The default value of app.allowRendererProcessReuse is deprecated, it is currently "false".  
// It will change to be "true" in Electron 9.  
// For more information please check https://github.com/electron/electron/issues/18397
// 手动设置为false，跟当前默认值保持一致，同时可清除终端中的log警告
app.allowRendererProcessReuse = false;

// 禁用硬件加速
app.disableHardwareAcceleration();

app.on('ready', () => {
    //注册快捷键打开控制台事件
    shortcut.register('F1+F2+F3');
    // 启动主窗体
    indexWin.create();
});

app.on('window-all-closed', function () {
    setTimeout(() => {
        const allwindow = BrowserWindow.getAllWindows();
        if (allwindow.length === 0) app.exit(1);
    }, 500);
});