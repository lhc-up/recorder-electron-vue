# recorder-electron-vue
### 安装依赖
```bash
git clone https://github.com/luohao8023/recorder-electron-vue.git
cd recorder-electron-vue
npm install
```
**第一次安装electron会有点慢，如果安装过程次中有报错，基本上是网络原因，把node_modules删除重新来一次，确保下载的依赖是完整的。**

### 本地调试
```bash
npm run dev
```
**如果遇到`Error: Cannot find module 'fs/promises'`相关的错误，请将nodejs升级至较新的稳定版本。**

### 打包
```bash
npm run build
```
**第一次打包会下载构建安装包的相关依赖，确保在网络条件较好的情况下进行。**

### 其他
**基于electron、vue、webpack的完整框架，可参考[electron-vue-template](https://github.com/luohao8023/electron-vue-template)**