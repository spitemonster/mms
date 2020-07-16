import './bootstrap.js'
import VueRouter from 'vue-router';

const Vue = require('vue');
Vue.use(VueRouter);

import App from './App.vue';
import Download from './components/Download.vue'
import ErrPage from './components/errPage.vue'
// const home = { template: `./App.vue` }
// const Download = { template: './components/Download.vue ' }

const routes = [
	{ name: 'home', path: '/', component: App },
	{ name: 'download', path: '/download/:id', component: Download },
	{ name: 'error', path: '/404', component: ErrPage }
];

const router = new VueRouter({
	mode: 'history',
	routes
})

var app = new Vue({
	el: '#app',
	router,
	components: {
		App,
		Download,
		ErrPage
	}
})
