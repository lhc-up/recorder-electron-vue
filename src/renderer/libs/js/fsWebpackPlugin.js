var path = require("path");
var fs = require("fs");

function FsWebpackPlugin(_workSpace) {
    var self=this;
    var workSpace = _workSpace ? _workSpace : process.cwd();
    function getFilePath(_path,_isAbsolutePath) {
        if(_isAbsolutePath)return _path;
        var aux=(_path.substr(0,1)=="/" || _path.substr(0,1)=="\\")?".":"";
        var filePath=path.join(workSpace,aux+_path);
        return path.normalize(filePath);
    }
    this.existsFile = function(_name,_isAbsolutePath) {
        return fs.existsSync(getFilePath(_name,_isAbsolutePath));
    }
    this.existsPath = function(_name,_isAbsolutePath) {
        return fs.existsSync(getFilePath(_name,_isAbsolutePath)).isDirectory();
    }
    //设置工作空间
    this.setWorkSpace = function(_workSpace) {
        workSpace = _workSpace ? _workSpace : process.cwd();
    }
    this.getWorkSpace = function() {
        return workSpace;
    }
    this.copyPath = function(_from, _to,_isAbsolutePath) {
        var fromPath =getFilePath(_from,_isAbsolutePath);
        var toPath =getFilePath(_to,_isAbsolutePath);
        if (!fs.existsSync(fromPath)) return [];
        if (!fs.existsSync(toPath + path.sep)) fs.mkdirSync(toPath + path.sep);

        function readPath(_from, _to) {
            var fileArr = [];
            var readDir = fs.readdirSync(_from);
            readDir.forEach(function(fileName) {
                var pathFromStr = path.join(_from, fileName);
                var pathToStr = path.join(_to, fileName);
                var statInfo = fs.statSync(pathFromStr);
                if (statInfo.isFile()) {
                    fileArr.push(pathFromStr);
                    fs.writeFileSync(pathToStr, fs.readFileSync(pathFromStr));
                } else if (statInfo.isDirectory()) {
                    fileArr.push(pathFromStr + path.sep);
                    if (!fs.existsSync(pathToStr)) {
                        fs.mkdirSync(pathToStr);
                    }
                    fileArr = fileArr.concat(readPath(pathFromStr, pathToStr));
                }
            })
            return fileArr;
        }
        return readPath(fromPath, toPath);
    }
    this.copyFile = function(_from, _to,_isAbsolutePath) {
        var fromPath = getFilePath(_from,_isAbsolutePath);
        var toPath = getFilePath(_to,_isAbsolutePath);
        fs.writeFileSync(toPath, fs.readFileSync(fromPath));
    }
    this.readFile = function(_fileName, _code,_isAbsolutePath) {
        return fs.readFileSync(getFilePath(_fileName,_isAbsolutePath), _code);
    }
    this.readDir=function(_filepath,_isAbsolutePath){
        return fs.readdirSync(getFilePath(_filepath,_isAbsolutePath));
    }
    this.mkdirs=function(dirname,_isAbsolutePath) {
        var pathFull=getFilePath(dirname,_isAbsolutePath);
        var pathObj=path.parse(pathFull);
        var pathStr= pathObj.dir.substr(pathObj.root.length);
        var pathStrArr=pathStr.split(path.sep);
        var currentPath=pathObj.root;
        pathStrArr.forEach(pathItem=>{
            if(!pathItem)return;
            currentPath+=pathItem+path.sep;
            var result=fs.existsSync(currentPath);
            if(!result){
                fs.mkdirSync(currentPath);
            }
        });
    }
    this.fileState=function(_file,_isAbsolutePath){
        return fs.statSync(getFilePath(_file,_isAbsolutePath));
    }
    this.writeFile = function(_fileName, _content,_isAbsolutePath) {
        var filePath=getFilePath(_fileName,_isAbsolutePath);
        this.mkdirs(filePath,true);
        var fileId=fs.openSync(filePath,"w");
        var reslut=fs.writeFileSync(fileId, _content)
        fs.closeSync(fileId);
        return reslut;
    }
    this.findFile = function(_path, _filter,_isAbsolutePath) {
        var fromPath = getFilePath(_path,_isAbsolutePath);

        function readPath(_path) {
            var fileArr = [];
            if (!fs.existsSync(_path)) return fileArr;
            var readDir = fs.readdirSync(_path);
            readDir.forEach(function(fileName) {
                var pathFileStr = path.join(_path, fileName);
                var statInfo = fs.statSync(pathFileStr);
                if (statInfo.isFile()) {
                    if (_filter && _filter.test && _filter.test(pathFileStr)) {
                        fileArr.push(pathFileStr);
                    } else {
                        fileArr.push(pathFileStr);
                    }
                } else if (statInfo.isDirectory()) {
                    fileArr = fileArr.concat(readPath(pathFileStr));
                }
            });
            return fileArr;
        }
        return readPath(fromPath);
    }
    this.deletePath = function(_path,_isAbsolutePath) {
        function deleteall(_path) {
            var files = [];
            if (fs.existsSync(_path)) {
                files = fs.readdirSync(_path);
                files.forEach(function(file, index) {
                    var curPath = _path + path.sep + file;
                    if (fs.statSync(curPath).isDirectory()) {
                        deleteall(curPath);
                    } else {
                        fs.unlinkSync(curPath);
                    }
                });
                fs.rmdirSync(_path);
            }
        };
        deleteall(getFilePath(_path,_isAbsolutePath));
    }
}
module.exports = FsWebpackPlugin;
