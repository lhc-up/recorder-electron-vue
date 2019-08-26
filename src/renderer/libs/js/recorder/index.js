import AudioRecorder from './recorder.js';
import FsWebpackPlugin from '../fsWebpackPlugin.js';
import MP3Converter from './converter.js';
let filePlus = new FsWebpackPlugin();

function Recorder(option={}) {
    this.supported = false;//是否支持
    this.ready = false;//是否就绪
    this.audioCtx = null;//音频环境
    this.recorder = null;//录音组件
    this.recording = false;//是否正在录音
    this.deviceChangeTimes = 0;//耳机插拔次数，这里是双倍，因为每次插拔耳机，监听事件会被调用两次

    this.defaultAudioInputDeviceId = null;//默认设备id，通过默认设备的groupId找到对应设备
    this.currentAudioInputDeviceId = null;//当前使用设备id
    this.audioInputList = [];//音频输入设备列表
    this.audioOutputList = [];//音频输出设备列表
    this.audioRecordOriginal = [];//原始录音数据
    this.checkTimer = null;//检测设备定时器

    this.events = {};//事件处理
    // 初始化
    this.init = async () => {
        try {
            // 初始化音频环境
            if (this.audioCtx) {
                this.closeAudioContext();
                this.recorder = null;
            }
            this.audioCtx = this.audioCtx || new AudioContext();
            this.supported = true;
        } catch (e) {
            this.supported = false;
            console.log('No web audio support in this browser!', e);
        }
        try {
            await this.getAudioInputList();
            await this.getComputerDefaultAudioInput();
            await this.ensureAudioInput();
        } catch (err) {
            console.log(err);
        }
    }
    // 获取音频输入设备列表
    this.getAudioInputList = () => {
        return new Promise((resolve, reject) => {
            navigator.mediaDevices.enumerateDevices().then(devices => {
                let audioInputList = devices.filter(item => {
                    return item.kind === 'audioinput';
                });
                let audioOutputList = devices.filter(item => {
                    return item.kind === 'audiooutput';
                });
                this.audioOutputList = audioOutputList;
                this.audioInputList = audioInputList;
                resolve(audioInputList);
            }).catch(err => {
                reject(err);
            });
        });
    }
    // 获取当前电脑默认音频输入设备
    this.getComputerDefaultAudioInput = () => {
        let audioInputList = this.audioInputList || [];
        if (audioInputList.length === 0) return false;
        let defaultGroupId = audioInputList.filter(item => item.deviceId === 'default')[0].groupId;
        let defaultAudioInput = audioInputList.filter(item => {
            return item.groupId === defaultGroupId && item.deviceId !== 'default';
        })[0];
        if (defaultAudioInput) {
            this.defaultAudioInputDeviceId = defaultAudioInput.deviceId;
        }
        return defaultAudioInput;
    }
    // 确定音频输入设备
    this.ensureAudioInput = () => {
        if (this.audioInputList.length === 0) {
            this.fire('ready');
            return false;
        }
        this.initAudioInput();
        this.currentAudioInputDeviceId = this.defaultAudioInputDeviceId;
    }
    // 使用具体的耳机
    this.useSpecifyEarphone = (deviceId) => {
        if(!deviceId) return;
        let config = {
            audio: {
                deviceId: {
                    exact: deviceId
                }
            }
        };
        this.initAudioInput(config);
        this.currentAudioInputDeviceId = this.deviceId;
    }
    // 初始化麦克风
    this.initAudioInput = (config={audio:true}) => {
        navigator.getUserMedia(config, this.getAudioStream, (e) => {
            // 所有错误，包括硬件不支持、用户拒绝授权等，都在这里输出
            console.log('设备不支持或用户拒绝授权：', e);
            this.supported = false;
            this.fire('ready');
        });
    }
    // 获取音频流
    this.getAudioStream = (stream) => {
        try {
            let mediaNode = this.audioCtx.createMediaStreamSource(stream);
            this.recorder = new AudioRecorder(mediaNode, {
                // 声道数
                numChannels: 1,
                // 比特率
                sampleBits: 16,
                // 压缩抽样数据，但没有改变采样率，不为1时可能会导致音频播放速度加快
                compressRate: 1
            });
            this.supported = true;
        } catch(err) {
            console.log('创建音频源失败，原因：', err);
            this.supported = false;
        }
        this.fire('ready');
    }
    // 监听耳机插拔
    this.listenDeviceChange = () => {
        // 来自官方文档：
        // We call updateDeviceList() in two places. 
        // The first is in the getUserMedia() promise's fulfillment handler,to initially fill out the list when the stream is opened. 
        // The second is in the event handler for devicechange:
        // 每次插拔耳机，ondevicechange会被调用2次
        // 第一次被调用是在getUserMedia的回调里，此时设备信息是变化之前的
        // 第二次被调用是在订阅的事件里,此时设备信息是变化之后的
        navigator.mediaDevices.ondevicechange = async (event) => {
            // 每次插拔之后重新初始化音频环境及设备
            this.deviceChangeTimes++;
            if (this.deviceChangeTimes % 2 === 0) {
                // 刷新设备列表
                await this.getAudioInputList();
                await this.getComputerDefaultAudioInput();
                this.fire('devicechange');
            } else {
                // 记录设备信息变化之前的设备信息
                this.lastAudioInputList = JSON.parse(JSON.stringify(this.audioInputList));
                this.lastAudioInputDeviceId = this.currentAudioInputDeviceId;
            }
        }
    }
    // 重新初始化，针对当前使用的设备被拔出的情况
    this.reInit = () => {
        this.stopRecord('ignoreFile');
        this.init();
    }
    // 开始录音
    this.startRecord = () => {
        if (this.recording) return;
        this.recorder && this.recorder.record();
        this.recording = true;
        // 获取实时音频，以便绘制音波图
        this.recorder && this.recorder.node.addEventListener('audioprocess', this.onAudioProcess);
    }
    // 停止录音
    // ignoreFile，停止录音时，是否忽略生成文件
    this.stopRecord = (ignoreFile) => {
        // TODO: 停止录音后销毁webworker
        if (!this.recording) return;
        this.recorder && this.recorder.stop();
        this.recording = false;
        this.recorder && this.recorder.node.removeEventListener('audioprocess', this.onAudioProcess);
        if (!ignoreFile) {
            this.handleAudioData();
        }
        this.recorder && this.recorder.clear();
    }
    // 检测设备是否正常
    this.checkDevice = (useTime) => {
        if (!useTime || isNaN(useTime)) return;
        if (this.recording) return console.log('Recorder is busy!');
        this.recorder && this.recorder.record();
        this.recorder && this.recorder.node.addEventListener('audioprocess', this.collectRecordBuffers);
        this.recording = true;
        this.checkTimer = setInterval(() => {
            if (useTime <= 0) {
                this.stopCheckDevice();
                let isVocal = this.analyIsVocalByRecord(this.audioRecordOriginal);
                this.fire('checkEnd', isVocal);
                this.recorder && this.recorder.clear();
            }
            useTime--;
        }, 1000);
    }
    // 停止检测设备
    this.stopCheckDevice = () => {
        this.recorder && this.recorder.stop();
        this.recorder && this.recorder.node.removeEventListener('audioprocess', this.collectRecordBuffers);
        this.recording = false;
        clearInterval(this.checkTimer);
        this.checkTimer = null;
    }
    // 实时录音回调函数,这里只把实时数据发送给订阅者
    this.onAudioProcess = () => {
        let dataArray = new Uint8Array(10);
        this.recorder && this.recorder.analyser.getByteTimeDomainData(dataArray);
        this.fire('audioprocess', dataArray);
    }
    // 保存每段录音buffer用于分析,这里需要保存每段实时数据,用于最后分析
    this.collectRecordBuffers = () => {
        let dataArray = new Uint8Array(10);
        this.recorder && this.recorder.analyser.getByteTimeDomainData(dataArray);
        this.audioRecordOriginal.push(dataArray[0]);
        this.fire('audioprocess', dataArray);
    }
    // 用方差分析原始录音数据，波动较小则认为没有声音，否则有声音
    this.analyIsVocalByRecord = (audioRecordOriginal) => {
        if (!audioRecordOriginal || !audioRecordOriginal.length) return;
        let mean = 0, sum = 0;
        sum = audioRecordOriginal.reduce((prev, cur) => prev + cur, 0);//求和
        mean = sum / audioRecordOriginal.length;//求平均数
        sum = audioRecordOriginal.reduce((prev, cur) => {
            return prev + Math.pow(cur - mean, 2);
        }, 0);//求每个样本值与平均数之差的平法的和
        // 这里认为方差大于0.3即为有声音
        return sum / audioRecordOriginal.length > 0.3;
    }
    // 处理音频数据，交由MP3Converter处理
    this.handleAudioData = () => {
        this.recorder && this.recorder.exportWAV(float32Array => {
            let sampleBits = this.recorder.config.sampleBits;
            let channels = this.recorder.config.numChannels;
            let sampleRate = this.recorder.context.sampleRate;
            let config = {
                samples: float32Array,
                numChannels: channels,
                sampleBits: sampleBits,
                sampleRate: sampleRate
            }
            let converter = new MP3Converter(config);
            converter.toMP3Blob(blob => {
                this.saveAudioDataToLocalFile(blob);
            });
        });
    }
    // 把处理完成的音频数据保存至本地文件
    this.saveAudioDataToLocalFile = (blob) => {
        let reader = new FileReader();
        reader.onload = (e) => {
            // arrayBuffer转换为buffer
            let buffer = this.arrayBuffer2buffer(e.target.result);
            // 检查是否存在不存在创建，然后写入音频
            filePlus.writeFile(`test.mp3`, buffer);
            this.fire('save');
        }
        // 把blob对象读取为arrayBuffer
        reader.readAsArrayBuffer(blob);
    }
    // arrayBuffer -> buffer
    this.arrayBuffer2buffer = (arrayBuffer) => {
        let buf = new Buffer(arrayBuffer.byteLength);
        let view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < buf.length; ++i) {
            buf[i] = view[i];
        }
        return buf;
    }
    // 订阅事件，每个事件仅允许订阅一次，后订阅的会覆盖之前的
    this.on = (eventName, handler) => {
        if (this.events[eventName]) {
            this.events[eventName].funcs = [handler];
        } else {
            this.events[eventName] = {
                funcs: [handler]
            }
        }
    }
    // 发布消息
    this.fire = (eventName, arg1, arg2) => {
        if (!this.events) return;
        if (!this.events[eventName]) return console.log('未订阅' + eventName + '事件');
        let funcs = this.events[eventName].funcs || [];
        funcs.forEach(func => {
            if (func && typeof func === 'function') {
                func(arg1, arg2);
            }
        });
    }
    // 移除注册事件
    this.removeEvent = (eventName) => {
        if (eventName === 'all') {
            this.events = null;
            return false;
        }
        if (!this.events[eventName]) return;
        this.events[eventName].funcs = [];
    }
    // 关闭音频环境，否则多次创建，超过6次之后将无法创建
    this.closeAudioContext = () => {
        this.audioCtx.close();
        this.audioCtx = null;
    }
    // 销毁
    this.destroy = () => {
        this.closeAudioContext();
        if (this.recorder) {
            this.recorder.stop();
            this.recorder.clear();
            this.recorder = null;
        }
        // 销毁所有监听及注册事件
        this.events = null;
        navigator.mediaDevices.ondevicechange = null;
        return null;
    }
    this.init();
    this.listenDeviceChange();
}

export default Recorder;