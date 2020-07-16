<template>
	<main>
		<h1 class="logo">MMS</h1>
		<div class='body--wrap'>
			<div class="form--wrapper">
				<form id="form">
					<div class="grid--2">
						<label class="input--wrap">
							<!-- <p class="tooltip">Change the name of the output files. If left blank, defaults to original image name.</p> -->
							<span>Output Filename</span>
							<input type="text" name="outputName">
						</label>
						<label class="input--wrap" id="image-select">
							<input type="file" name="image" id="image" @change="selectFile">
							<span>Select Image</span>
							<span tabindex="0" role="button" class="button">Browse...</span>
							<p id="filename">{{ filename }}</p>
							<p class="err" v-show="fileError">Please select a valid JP(EG), PNG, GIF or SVG image under 20mb.</p>
							<p class="err" v-show="inputError">Optimization and resizing options are available only for JPEG and PNG files.</p>
						</label>
					</div>
					<div class="advanced" v-show="imageSelected && !inputError">
						<h2>Advanced</h2>
						<button class="plus" @click.prevent="advanced = !advanced">
							<span v-if="!advanced">+</span>
							<span v-if="advanced">-</span>
						</button>
					</div>
					<div class="options" v-bind:class="{open: advanced}" v-show="imageSelected && !inputError">
						<div class="input--row grid--6">
							<label class="input--wrap select-all">
								<input type="checkbox" name="toggleAll" v-model="allSizes" />
								<span>All Sizes</span>
								<p class="tooltip">Toggle all sizes</p>
							</label>
							<label class="input--wrap">
								<input type="checkbox" name="sizes" value="xsmall" :checked="allSizes">
								<span>XSmall</span>
								<p class="tooltip">320px Wide</p>
							</label>
							<label class="input--wrap">
								<input type="checkbox" name="sizes" value="small" :checked="allSizes">
								<span>Small</span>
								<p class="tooltip">480px Wide</p>
							</label>
							<label class="input--wrap">
								<input type="checkbox" name="sizes" value="medium" :checked="allSizes">
								<span>Medium</span>
								<p class="tooltip">960px Wide</p>
							</label>
							<label class="input--wrap">
								<input type="checkbox" name="sizes" value="large" :checked="allSizes">
								<span>Large</span>
								<p class="tooltip">1280px Wide</p>
							</label>
							<label class="input--wrap">
								<input type="checkbox" name="sizes" value="retina" :checked="allSizes">
								<span>Retina</span>
								<p class="tooltip">2560px Wide</p>
							</label>
						</div>
						<label>
							<h2>Async Options</h2>
							<p class="tooltip">If Async is selected, an image 960px wide with reduced quality will be created, with optional blurring, pixellation or tessellation.</p>
						</label>
						<div class="input--row grid--6" style="--pad: 3">
							<label class="input--wrap">
								<input type="radio" name="async" value="none">
								<span>None</span>
								<p class="tooltip">No Async Option</p>
							</label>
							<label class="input--wrap">
								<input type="radio" name="async" value="pix">
								<span>Pixellate</span>
								<p class="tooltip">960px Wide, Pixellated, Extra Compressed</p>
							</label>
							<label class="input--wrap">
								<input type="radio" name="async" value="blur">
								<span>Blur</span>
								<p class="tooltip">960px Wide, Blurred, Extra Compressed</p>
							</label>
							<label class="input--wrap">
								<input type="radio" name="async" value="tri">
								<span>Tri</span>
								<p class="tooltip">960px Wide, Tessellated, Extra Compressed</p>
							</label>
						</div>
					</div>
				</form>
				<button class="submit" @click="upload" :disabled="!imageSelected">Upload</button>
			</div>
		</div>
		<User></User>
	</main>
</template>
<script>
import axios from 'axios';
import router from './index.js';
import User from './components/User.vue';

export default {
	name: 'App',
	data() {
		return {
			asyncSelected: false,
			advanced: false,
			inputError: false,
			svgError: false,
			fileError: false,
			allSizes: false,
			filename: 'No image selected.',
			imageSelected: false
		}
	},
	components: {
		User
	},
	props: [],
	methods: {
		upload(e) {
			e.preventDefault()
			let form = document.querySelector('#form');
			let fd = new FormData(form);
			axios.post('/upload', fd)
				.then((res) => {
					this.$router.push(`/download/${res.data.id}`)
				})
		},
		selectFile(e) {
			let image = e.target;
			let ext = image.value.split('.')[image.value.split('.').length - 1]
			let file = image.files[0]

			this.validateFile(file);
		},
		validateFile(file) {
			let image = document.querySelector('[name="image"]')
			let acceptedExt = ['jpg', 'jpeg', 'png', 'svg', 'gif']
			let ext = file.name.split('.')[file.name.split('.').length - 1]
			let valid = false;

			if (file.size > 20000000 || !acceptedExt.includes(ext)) {
				image.value = ''
				return this.fileError = true;
			}

			if (ext == 'svg' || ext == 'gif') {
				this.inputError = true;
			}

			this.fileError = false;
			this.imageSelected = true;
			this.filename = file.name;
		},
		showUserTools() {
			let ut = document.querySelector('.user-tools');

			if (ut.classList.contains('show')) {
				return ut.classList.remove('show')
			}

			ut.classList.add('show');
		},
		preventDefaults(e) {
			e.preventDefault()
			e.stopPropagation()
		},
		highlightDropArea() {

		},
		unlightDropArea() {

		}
	},
	mounted() {

		['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
			window.addEventListener(eventName, this.preventDefaults, false)
		})

		window.addEventListener('dragenter', () => {
			document.body.classList.add('dropArea')
			console.log('drag entering')
		})

		window.addEventListener('dragleave', () => {
			document.body.classList.remove('dropArea')
			console.log('drag exited')
		})

		window.addEventListener('drop', (e) => {
			let event = new Event('change');
			let img = document.querySelector('input[name="image"]');

			let files = e.dataTransfer.files
			img.files = files
			img.dispatchEvent(event)

			document.body.classList.remove('dropArea')
		})
	}
}

</script>
