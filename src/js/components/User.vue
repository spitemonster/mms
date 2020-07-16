<template>
	<aside class="user-tools">
		<h3>User Images</h3>
		<div class="img-tile__wrap" v-if="userImages.length > 0">
			<a :href="'/download/' + img.id" class="img-tile" v-for="img in userImages">
				<img :src="img.iconUrl" class="icon">
				<p>{{ img.id }}</p>
				<button @click.prevent="deleteUserImage(img.id)" aria-label="Delete Image">X</button>
			</a>
		</div>
		<div v-else>
			<p class="err">No user images stored.</p>
		</div>
		<div class="links">
			<button @click.prevent="deleteUserStorage" class="small" alt="Clears are user data.">Clear All User Data</button>
			<button @click.prevent="denyStorage" class="link-button" alt="Clears all stored user data and prevents new user data from being saved.">Reject All User Data</button>
		</div>
		<button @click="showUserTools" class="open">
			<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd">
				<path d="M24 18v1h-24v-1h24zm0-6v1h-24v-1h24zm0-6v1h-24v-1h24z" fill="#1040e2" />
				<path d="M24 19h-24v-1h24v1zm0-6h-24v-1h24v1zm0-6h-24v-1h24v1z" /></svg>
		</button>
	</aside>
</template>
<script>
import axios from 'axios';

export default {
	name: 'User',
	data() {
		return {
			userImages: []
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
			this.userImages = localStorage.getItem('userImages')
		},
		denyStorage() {
			localStorage.removeItem('userImages')
			localStorage.setItem('no-storage', true)

			this.userImages = localSTorage.getItem('userImages')
		},
		showUserTools() {
			let el = this.$el
			if (el.classList.contains('show')) {
				return el.classList.remove('show')
			}
			el.classList.add('show')
		}
	},
	mounted() {
		let userImages = JSON.parse(localStorage.getItem('userImages'));
		let now = Date.now()
		let days = 60 * 60 * 72 * 1000

		if (!userImages) {
			return;
		}

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
