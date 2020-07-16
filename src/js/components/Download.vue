<template>
	<main>
		<h1>Download</h1>
		<img id="original">
		<div id="image--wrapper" data-width="800" :style="{ height: scaledHeight }">
			<a :href="file.url" v-for="file, i in files" :style="{ '--offset': i }">
				<img class="int--img" :src="file.url" />
				<span class="img-details">{{ file.size }} / {{ file.width }}px / {{ file.fileSize }}</span>
			</a>
		</div>
		<pre v-if="code" class="code--example">
			<code>
      			{{ code }}
      		</code>
      	</pre>
		<div class="exp">
			<p>This file will expire in {{ exp }}</p>
		</div>
		<div class="async--info">
			<p class="tooltip">Example code is intended for use with the asynchronous image loading script available <a href="https://github.com/spitemonster/utilities">here</a></p>
		</div>
		<div class="links">
			<a :href="zipUrl" class="button">Download Zip</a>
			<a href="https://github.com/spitemonster/image-optim" class="button">Report Bug / Request Feature</a>
			<a href="/" class="button">Return</a>
		</div>
		<wait v-show="waiting"></wait>
	</main>
</template>
<script>
import axios from 'axios';
import wait from './wait.vue'

export default {
	name: '',
	data() {
		return {
			waiting: true,
			exp: '72:00:00',
			owidth: null
		}
	},
	components: {
		wait
	},
	props: [],
	methods: {
		test() {
			let int = window.setInterval(() => {
				if (!this.waiting) {
					return clearInterval(int);
				}

				axios.get((`/test/${this.id}`))
					.then((res) => {
						let preload = document.querySelector('#original')
						if (res.status === 200) {
							let storageUrl = res.data.files.files.find(f => f.size == 'xsmall') ? res.data.files.files.find(f => f.size == 'xsmall').url : res.data.files.files.find(f => f.size == 'original').url
							console.log(res.data)
							if (localStorage.getItem('no-storage') != 'true') {
								let userImages = JSON.parse(localStorage.getItem('userImages')) ? JSON.parse(localStorage.getItem('userImages')) : [];
								let imgData = {
									id: this.id,
									iconUrl: storageUrl,
									created: res.data.created
								}

								userImages.push(imgData)

								localStorage.setItem('userImages', JSON.stringify(userImages))
							}

							this.FART(res.data)
						}
					})
					.catch((err) => {
						console.log('there was an error: ' + err)
					})
			}, 1000)
		},
		msToTime() {
			let exp = this.created + 259200000
			let now = Date.now()
			let ms = exp - now
			var seconds = ms / 1000
			var hours = parseInt(seconds / 3600)
			seconds = seconds % 3600
			var minutes = parseInt(seconds / 60)
			seconds = Math.floor(seconds % 60)

			if (minutes < 10) {
				minutes = '0' + minutes
			}

			if (seconds < 10) {
				seconds = '0' + seconds
			}

			this.exp = hours + ':' + minutes + ':' + seconds
		},
		loadData(data) {
			this.msToTime();
			this.waiting = false;
			let imgWrap = document.querySelector('#image--wrapper');
			imgWrap.style.setProperty('--cells', Object.keys(this.files).length);
			window.setInterval(this.msToTime, 1000);
		},
		originalSize(e) {
			let oSize = document.querySelector('.original-size')

			oSize.innerText = `${e.target.naturalWidth}px`
		},
		FART(data) {
			let preload = document.querySelector('#original');

			this.files = data.files.files.sort((a, b) => {
				return a.width - b.width;
			})

			let async = this.files.splice(this.files.findIndex(e => e.size == 'async'), 1);
			this.files.unshift(async [0])


			this.code = data.files.code
			this.created = data.created

			this.zipUrl = `/download/${this.id}/zip`

			let og = this.files.find(file => file.size === 'original')

			preload.setAttribute('src', og.url)

			preload.addEventListener('load', (e) => {
				this.originalWidth = e.target.naturalWidth;
				this.scaledHeight = `${(800 / this.originalWidth) * e.target.naturalHeight}px`;

				this.files.find(e => e.size == 'original').width = e.target.naturalWidth;
				this.loadData(data)
			})
		}
	},
	created() {

	},
	mounted() {
		this.id = this.$route.params.id


		axios.get(`/test/${this.id}`)
			.then((res) => {
				let preload = document.querySelector('#original')
				if (res.status !== 200) {
					return this.test();
				}

				this.FART(res.data)
			})
			.catch((err) => {
				// console.log(err.response)
				this.$router.push({ name: 'error', params: { errStatus: err.response.status, errMessage: err.response.data } })
			})
	}
}

</script>
<style lang="css">
</style>
