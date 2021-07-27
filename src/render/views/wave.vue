<template>
    <div class="sonicBox">
        <div class="startLine line"></div>
        <div class="item" ref="item" :class="'item'+[i]" v-for="i in 10" :key="i"></div>
        <div class="endLine line"></div>
    </div>
</template>
<script>
export default {
    props: {
        unitArry:{
            type:Array,
            default:[]
        }
    },
    watch:{
        unitArry(newVal){
            this.setAnimate(newVal);
        }
    },
    methods: {
        setAnimate(unitArry) {
            for(let i=0;i<unitArry.length;i++){
                let dom=this.$refs.item[i];
                let cha=Number(unitArry[i])-126;
                let num=0;
                num = Math.abs(cha)/126 * 100;
                
                if(cha > 0){
                    dom.style.height=5 + num +"px";
                }else if(cha < 0){
                    dom.style.height=5 - num +"px";
                }else{
                    dom.style.height=5+"px";
                }
            }
        }
    }
}
</script>
<style scoped lang="less">
.sonicBox{
    display: table;
    width: 150px;
    height: 30px;
    vertical-align: bottom;
    .line{
        display: inline-block;
        width:20px;
        height: 3px;
        border-radius: 2px;
        background-color: #6388f7;
        margin-right: 6px;
        vertical-align: middle;
        &.endLine{
            background-color: #d79df9;
            margin-right: 0px;
            margin-left: 6px;
        }
    }
    .item{
        display: inline-block;
        height: 5px;
        min-height: 3px;
        max-height: 25px;
        width: 3px;
        margin: 0px 3px;
        border-radius: 30px;
        vertical-align: middle;
        &.item1{
            background-color: #638af7;
        }
        &.item2{
            background-color: #6388f6;
        }
        &.item3{
            background-color: #658af7;
        }
        &.item4{
            background-color: #6e8cf7;
        }
        &.item5{
            background-color: #9592f8;
        }
        &.item6{
            background-color: #b398f8;
        }
        &.item7{
            background-color: #cf9df9;
        }
        &.item8{
            background-color: #d79df9;
        }
        &.item9{
            background-color: #d79df9;
        }
        &.item10{
            background-color: #d89df8;
        }
    }

}
</style>