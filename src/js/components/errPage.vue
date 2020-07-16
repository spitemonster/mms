<template lang="html">
	<div class="body--wrapper">
		<h1 class="logo">MMS</h1>
		<div class="output--wrapper">
			<h1>{{ statusCode }}</h1>
			<p>{{ message }}</p>
			<div class="links">
				<a href="/" class="link--button">Return</a>
			</div>
		</div>
	</div>
</template>
<script>
export default {
	data() {
		return {
			message: this.$route.params.errMessage,
			statusCode: this.$route.params.errStatus
		}
	},
	mounted() {
		this.$route.params.error
	}
}

</script>
<style lang="css">
</style>
