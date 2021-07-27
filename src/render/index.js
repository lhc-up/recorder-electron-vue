import Vue from 'vue';
import index from './views/index.vue';

const app = new Vue({
    el: '#app',
    render: h => h(index)
});