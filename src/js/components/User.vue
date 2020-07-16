<template>
	<aside class="user-tools">
		<h3>User Images</h3>
		<a :href="'/download/' + img.id" class="img-tile" v-for="img in userImages">
			<img :src="img.iconUrl" class="icon">
			<p>{{ img.id }}</p>
			<button @click.prevent="deleteUserImage(img.id)" aria-label="Delete Image">X</button>
		</a>
		<div class="links">
			<button @click.prevent="deleteUserStorage" class="small">Clear Storage</button>
			<button @click.prevent="denyStorage" class="link-button">Reject Local Storage</button>
		</div>
	</aside>
</template>
<script>
import axios from 'axios';

export default {
	name: '',
	data() {
		return {
			userImages: {}
		}
	},
	props: [],
	methods: {
		deleteUserImage(id) {
			axios.delete(`/${id}`)
				.then((res) => {
					this.userImages = this.userImages.filter((img) => {
						return !(id === img.id)
					})

					localStorage.setItem('userImages', JSON.stringify(this.userImages));
				})
				.catch((err) => {
					console.log('err: ' + err)
				})
		},
		deleteUserStorage() {
			localStorage.removeItem('userImages')
			this.userImages = localSTorage.getItem('userImages')
		},
		denyStorage() {
			localStorage.removeItem('userImages')
			localStorage.setItem('no-storage', true)

			this.userImages = localSTorage.getItem('userImages')
		}
	},
	mounted() {
		let userImages = JSON.parse(localStorage.getItem('userImages'));
		let now = Date.now()
		let days = 60 * 60 * 72 * 1000

		let filteredImages = userImages.filter((img) => {
			return !(now - img.created > days)
		})

		localStorage.setItem('userImages', JSON.stringify(filteredImages))
		this.userImages = filteredImages
	}
}

</script>
<style lang="css">
</style>
