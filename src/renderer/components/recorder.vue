<template>
    <div class="recorder">
        <div v-if="ready" class="ready">
            <div class="row">
                <div class="tag">设备是否可用：</div>
                <div class="rowContent">是</div>
            </div>
            <div class="row">
                <div class="tag">输入设备列表：</div>
                <div class="rowContent">
                    <select>
                        <option v-for="item in audioInputList" :key="item.label">{{item.label}}</option>
                    </select>
                </div>
            </div>
            <div class="row">
                <div class="tag">输出设备列表：</div>
                <div class="rowContent">
                    <select>
                        <option v-for="item in audioOutputList" :key="item.label">{{item.label}}</option>
                    </select>
                </div>
            </div>
            <div class="row">
                <div class="tag">操作按钮：</div>
                <div class="rowContent">
                    <button @click="checkDevice">开始试音</button>
                    <button @click="startRecord">开始录音</button>
                    <button @click="stopRecord">停止录音</button>
                </div>
            </div>
            <div class="row">
                <div class="tag">录音时间：</div>
                <div class="rowContent">
                    {{duration}}s
                </div>
            </div>
            <div v-show="recording" class="waveWrap">
                <div v-for="(item, index) in waveArr" :key="index" :style="{height:item+'px'}" class="item"></div>
            </div>
        </div>
        <div v-else class="unReady">
            <button @click="initRecorder">点击初始化音频环境</button>
            <div v-if="showError" class="errorTip">初始化失败，请检查1、是否禁用麦克风权限；2、是否禁用音频设备。</div>
        </div>
    </div>
</template>

<script>
    import Recorder from '@/libs/js/recorder/index.js';
    export default {
        name: 'recorder',
        data() {
            return {
                ready: false,
                recorder: null,
                showError: false,
                audioInputList: [],
                audioOutputList: [],
                waveArr: [],//用来绘制波形的数组
                recording: false,//是否正在录音
                duration: 0,
                timer: null
            }
        },
        methods: {
            initRecorder() {
                if (this.recorder) return;
                this.recorder = new Recorder();
                this.recorder.on('ready', () => {
                    const recorder = this.recorder;
                    console.log('初始化完毕')
                    console.log(this.recorder)
                    this.showError = !recorder.supported;
                    this.ready = recorder.supported;
                    this.audioInputList = recorder.audioInputList;
                    this.audioOutputList = recorder.audioOutputList;
                    if (recorder.supported) {
                        this.listenDeviceChange();
                    }
                });
            },
            // 检测设备
            checkDevice() {
                this.recording = true;
                this.recorder.checkDevice(5);
                this.recorder.on('audioprocess', (arr) => {
                    this.drawWaves(arr);
                });
                this.recorder.on('checkEnd', (result) => {
                    this.recording = false;
                    if (result) {
                        alert('试音结束，一切正常！');
                    } else {
                        alert('试音结束，没有声音，请检查音频设备！');
                    }
                });
            },
            // 开始录音
            startRecord() {
                this.recording = true;
                this.recorder && this.recorder.startRecord();
                this.recorder.on('audioprocess', (arr) => {
                    this.drawWaves(arr);
                });
                this.timer = setInterval(() => {
                    this.duration++;
                }, 1000);
            },
            stopRecord() {
                this.recording = false;
                this.recorder.stopRecord();
                this.recorder.on('save', () => {
                    this.timer = clearInterval(this.timer);
                    alert('已生成mp3文件！');
                });
            },
            listenDeviceChange() {
                this.recorder.on('devicechange', () => {
                    const r = confirm('检测到音频设备发生了变化，需要重新初始化音频环境！');
                    this.recorder = this.recorder.destroy();
                    this.initRecorder();
                });
            },
            drawWaves(arr) {
                const waveArr = [];
                arr.forEach(v => {
                    waveArr.push(v);
                });
                this.waveArr = waveArr;
            },
            init() {}
        },
        mounted() {
            this.init();
        }
    }
</script>

<style>
    /* CSS */
    .row {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
    }
    select {
        width: 160px;
    }
    button {
        height: 30px;
        margin: 20px 0 0 30px;
    }
    .errorTip {
        padding: 20px 30px;
    }
    .waveWrap {
        width: 200px;
        padding: 20px 0 0 20px;
    }
    .waveWrap .item {
        display: inline-block;
        width: 10px;
        margin: 0 5px;
        vertical-align: middle;
        background-color: #1890ff;
    }
</style>
