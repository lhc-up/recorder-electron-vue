import MP3Worker from './convert.worker.js';
let MP3Converter = function(config = {}) {
    let busy = false;
    let mp3Worker = MP3Worker();
        
    let _this = this;

    this.isBusy = function() {
        return busy;
    };
    this.encodeWavBlob = function(samples=[], numChannels, sampleBits, sampleRate) {
        let writeString = function(view, offset, string) {
            for (var i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        }
        let floatTo8BitPCM = function(output, offset, input) {
            for (var i = 0; i < input.length; i++, offset++) {
                var s = Math.max(-1, Math.min(1, input[i]));
                var val = s < 0 ? s * 0x8000 : s * 0x7FFF;
                val = parseInt(255 / (65535 / (val + 32768)));
                output.setInt8(offset, val, true);
            }
        }
        let floatTo16BitPCM = function(output, offset, input) {
            for (var i = 0; i < input.length; i++, offset += 2) {
                var s = Math.max(-1, Math.min(1, input[i]));
                output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
        }
        var dataLength = samples.length * (sampleBits / 8);
        var buffer = new ArrayBuffer(44 + dataLength);
        var view = new DataView(buffer);
        // 资源交换文件标识符
        writeString(view, 0, 'RIFF');
        // 下个地址开始到文件尾总字节数,即文件大小-8
        view.setUint32(4, 36 + dataLength, true);
        // WAV文件标志
        writeString(view, 8, 'WAVE');
        // 波形格式标志
        writeString(view, 12, 'fmt ');
        // 过滤字节,一般为 0x10 = 16
        view.setUint32(16, 16, true);
        // 格式类别 (PCM形式采样数据)
        view.setUint16(20, 1, true);
        // 通道数
        view.setUint16(22, numChannels, true);
        // 采样率,每秒样本数,表示每个通道的播放速度
        view.setUint32(24, sampleRate, true);
        // 波形数据传输率 (每秒平均字节数) 通道数×每秒数据位数×每样本数据位/8
        view.setUint32(28, sampleRate * numChannels * (sampleBits / 8), true);
        // 块数据调整数 采样一次占用字节数 通道数×每样本的数据位数/8
        view.setUint16(32, numChannels * (sampleBits / 8), true);
        // 每样本数据位数
        view.setUint16(34, sampleBits, true);
        // 数据标识符
        writeString(view, 36, 'data');
        // 采样数据总数,即数据总大小-44
        view.setUint32(40, dataLength, true);
        // 采样数据
        if (sampleBits == 16) {
            floatTo16BitPCM(view, 44, samples);
        } else {
            floatTo8BitPCM(view, 44, samples);
        }
        let blob = new Blob([view], {type: 'audio/wav'});
        return blob;
    };
    this.convert = function(config, successCb, progressCb, errorCb) {
        let conversionId = 'id_' + Date.now(),
            tag = conversionId + ':';
        console.log(tag, '开始转换.........');
        let blob = _this.encodeWavBlob(config.samples, config.numChannels, config.sampleBits, config.sampleRate);

        if (busy) {
            throw('另外一个转换程序正在进行中，请稍后......');
        }

        let initialSize = blob.size,
            fileReader = new FileReader,
            startTime = Date.now();
        fileReader.onload = function(e) {
            console.log('开始后台转换......');
            mp3Worker.postMessage({
                cmd: 'init',
                config: config
            });
            mp3Worker.postMessage({
                cmd: 'encode',
                rawInput: e.target.result
            });
            mp3Worker.postMessage({
                cmd: 'finish'
            });
            mp3Worker.onmessage = function(e) {
                if (e.data.cmd == 'end') {
                    console.log(tag, 'MP3转换完成......');
                    let mp3Blob = new Blob(e.data.buf, {type: 'audio/mp3'});
                    console.log(tag, "转换用时: " + ((Date.now() - startTime) / 1000) + 's');
                    let finalSize = mp3Blob.size;
                    console.log(tag +
                        "初始大小: = " + initialSize + ", " +
                        "最终大小 = " + finalSize
                        + ", 体积减小: " + Number((100 * (initialSize - finalSize) / initialSize)).toPrecision(4) + "%");
                    busy = false;
                    if (progressCb && typeof progressCb=='function') {
                        progressCb(1);
                    }
                    if (successCb && typeof successCb === 'function') {
                        successCb(mp3Blob);
                    }
                } else if (e.data.cmd == 'progress') {
                    if(progressCb && typeof progressCb == 'function'){
                        progressCb(e.data.progress);
                    }
                } else if (e.data.cmd == 'error') {
                    console.log(e.data.msg);
                    // 转换失败之后返回空文件，以免文件数量不够，影响数据压缩上传
                    if (successCb && typeof successCb === 'function') {
                        let blob = new Blob();
                        successCb(blob);
                    }
                    if (errorCb && typeof errorCb == 'function') {
                        errorCb(e.data.msg);
                    }
                }
            };
        };
        busy = true;
        fileReader.readAsArrayBuffer(blob);
    };
}
export default MP3Converter;