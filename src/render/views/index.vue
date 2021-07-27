<template>
    <div class="wrap">
        <div class="operate">
            <button v-if="!isReady" @click="init" class="primary">初始化</button>
            <template v-else>
                <button @click="startRecord" class="primary">开始录音</button>
                <button @click="stopRecord" class="error">停止录音</button>
                <wave :unitArry="waveArr"></wave>
            </template>
        </div>
        <p>同时按下“F1、F2、F3”可打开控制台</p>
        <div v-if="isReady" class="content">
            <div class="contentLeft">
                <div v-if="!recorder.supported" class="err">硬件不支持或当前电脑已禁用麦克风！</div>
                <h3 class="type">音频输入设备列表</h3>
                <div class="inputList">
                    <div class="input" v-for="input in audioInputList" :key="input.deviceId">
                        <h4 class="name">{{input.label}}</h4>
                        <div class="attr">
                            <span class="key">label:</span>
                            <span class="val">{{input.label}}</span>
                        </div>
                        <div class="attr">
                            <span class="key">deviceId:</span>
                            <span class="val">{{input.deviceId}}</span>
                        </div>
                        <div class="attr">
                            <span class="key">kind:</span>
                            <span class="val">{{input.kind}}</span>
                        </div>
                        <div class="attr">
                            <span class="key">groupId:</span>
                            <span class="val">{{input.groupId}}</span>
                        </div>
                    </div>
                </div>
                <h3 class="type">音频输出设备列表</h3>
                <div class="outputList">
                    <div class="input" v-for="input in audioOutputList" :key="input.deviceId">
                        <h4 class="name">{{input.label}}</h4>
                        <div class="attr">
                            <span class="key">label:</span>
                            <span class="val">{{input.label}}</span>
                        </div>
                        <div class="attr">
                            <span class="key">deviceId:</span>
                            <span class="val">{{input.deviceId}}</span>
                        </div>
                        <div class="attr">
                            <span class="key">kind:</span>
                            <span class="val">{{input.kind}}</span>
                        </div>
                        <div class="attr">
                            <span class="key">groupId:</span>
                            <span class="val">{{input.groupId}}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="contentRight">
                <div class="intro">
                    <p>label:设备名称</p>
                    <p>deviceId:设备id,值为default时，表示此设备为当前电脑默认设备，要找到真正的deviceId，可通过groupId去匹配</p>
                    <p>kind:设备类型，audioinput表示音频输入，audiooutput表示音频输出</p>
                    <p>groupId:设备分组id，比如有些设备自带音频输入和输出，则它们的分组id是一样的</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import wave from './wave.vue';
import Recorder from '@/render/libs/recorder/myRecorder.js';
const { dialog } = require('electron').remote;
const fs = require('fs');
export default {
    data() {
        return {
            recorder: null,
            audioInputList: [],
            audioOutputList: [],
            isReady: false,
            waveArr: []
        }
    },
    components: { wave },
    methods: {
        init() {
            this.recorder = new Recorder();
            console.log(this.recorder);
            this.recorder.on('ready', () => {
                console.log('ready')
                this.audioInputList = this.recorder.audioInputList;
                console.log(this.audioInputList)
                this.audioOutputList = this.recorder.audioOutputList;
                this.isReady = true;
            });
            this.recorder.on('devicechange', () => {
                alert('设备信息发生了变化');
            });
            this.recorder.on('audioprocess', data => {
                console.log(data);
                this.drawWave(data);
            });
        },
        // 开始录音
        startRecord() {
            if (!this.recorder || !this.recorder.supported) {
                alert('硬件不支持或当前电脑已禁用麦克风！');
                return;
            }
            if (this.recorder.recording) return;
            this.recorder.startRecord();
        },
        // 停止录音
        stopRecord() {
            this.recorder.stopRecord();
            this.recorder.saveMP3(buffer => {
                const savePath = dialog.showSaveDialogSync({
                    title: '保存文件',
                    filters: [
                        {
                            name: 'mp3',
                            extensions: ['.mp3']
                        }
                    ]
                });
                if (!savePath || !savePath.endsWith('.mp3')) {
                    alert('必须保存为mp3格式');
                    return;
                }
                fs.writeFile(savePath, buffer, err => {
                    if (err) {
                        console.log(err);
                    } else {
                        // 保存完之后清除数据，或在其他合适时机清除，否则录音数据一直叠加
                        this.recorder.clear();
                        alert(`文件已保存至:${savePath}`);
                    }
                });
            });
        },
        // 音轨
        drawWave(dataArray) {
            this.waveArr.splice(0,this.waveArr.length);
            let data=dataArray.slice(0,10);
            this.waveArr.push(data[0],data[1],data[2],data[3],data[4],data[5],data[6],data[7],data[8],data[9]);
        }
    },
    mounted() {
        
    },
    beforeDestroy() {
        if (this.recorder) {
            this.recorder.destory();
            this.recorder = null;
        }
    }
}
</script>

<style lang="less" scoped>
.wrap {
    .operate {
        display: flex;
        justify-content: flex-start;
        button {
            width: 80px;
            height: 32px;
            margin-right: 20px;
            text-align: center;
            line-height: 28px;
            border-radius: 6px;
            outline: none;
            cursor: pointer;
            &.primary {
                background-color: #597ef7;
                color: #fff;
            }
            &.error {
                border-color: #ff7875;
                color: #ff7875;
            }
        }
    }
}
.content {
    display: flex;
    width: 100%;
    .contentLeft {
        width: 50%;
        position: relative;
        &:after {
            display: block;
            position: absolute;
            right: 0;
            top: 0;
            content: "";
            width: 1px;
            height: 100%;
            background-color: #bfbfbf;
        }
        h3.type {
            margin: 30px 0 10px;
        }
        .inputList, .outputList {
            .input {
                h4.name {
                    margin: 10px 0 5px;
                }
                .attr {
                    padding-left: 16px;
                    font-size: 14px;
                    color: #595959;
                }
            }
        }
    }
    .contentRight {
        width: 50%;
        .intro {
            padding-top: 20px;
            padding: 16px 0 16px 16px;
            color: #595959;
            p {
                margin: 0 0 5px;
            }
        }
    }
}

</style>