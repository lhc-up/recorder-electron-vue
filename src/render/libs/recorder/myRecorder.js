import AudioRecorder from './recorder.js';
import MP3Converter from './convertMP3/index.js';
const path = require('path');
const fs = require('fs');

function Recorder(option={}) {
    this.supported = false;//是否支持
    this.ready = false;//是否就绪
    this.audioCtx = null;//音频环境
    this.recorder = null;//录音组件
    this.recording = false;//是否正在录音

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
    // 确定音频输入设备
    this.ensureAudioInput = () => {
        if (this.audioInputList.length === 0) {
            this.fire('ready');
            return false;
        }
        try {
            this.initAudioInput();
        } catch(err) {
            console.log('初始化麦克风失败:', err);
        }
    }
    // 通过deviceId初始化固定设备
    this.initAudioInputByDeviceId = deviceId => {
        const config = {
            audio: {
                deviceId: {
                    exact: deviceId
                }
            }
        }
        this.initAudioInput(config);
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
            this.fire('devicechange');
        }
    }
    // 重新初始化，针对当前使用的设备被拔出的情况
    this.reInit = () => {
        this.stopRecord();
        this.clear();
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
    this.stopRecord = () => {
        // TODO: 停止录音后销毁webworker
        if (!this.recording) return;
        this.recorder && this.recorder.stop();
        this.recording = false;
        this.recorder && this.recorder.node.removeEventListener('audioprocess', this.onAudioProcess);
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
    this.saveMP3 = cb => {
        this.recorder && this.recorder.exportWAV(float32Array => {
            let converter = new MP3Converter();
            let sampleBits = this.recorder.config.sampleBits;
            let channels = this.recorder.config.numChannels;
            let sampleRate = this.recorder.context.sampleRate;
            let config = {
                samples: float32Array,
                numChannels: channels,
                sampleBits: sampleBits,
                sampleRate: sampleRate
            }
            // 录音数据交由converter后台处理
            converter.convert(config, blob => {
                const reader = new FileReader();
                reader.onload = e => {
                    // arrayBuffer转换为buffer
                    const buffer = this.arrayBuffer2buffer(e.target.result);
                    cb(buffer);
                }
                // 把blob对象读取为arrayBuffer
                reader.readAsArrayBuffer(blob);
            });
        });
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
    // 清除录音数据
    this.clear = () => {
        this.recorder.clear();
    }
    // 销毁
    this.destroy = () => {
        this.closeAudioContext();
        if (this.recorder) {
            this.recorder.stop();
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