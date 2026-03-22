<script lang="ts">
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>Thank You</title>
	<meta
		name="description"
		content="Registration confirmation with QR code for a hackathon submission."
	/>
</svelte:head>

<div class="shell">
	<div class="intro">
		<h1>Thank you for registering</h1>
		<p class="id">{data.registrationId}</p>
	</div>

	<div class="card">
		<img src={data.qrCodeDataUrl} alt={`QR code for registration ${data.registrationId}`} />
		<p>Scan to open this registration ID.</p>
		<p class="link">{data.registrationUrl}</p>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
		background: #f5f2eb;
		color: #111;
	}

	.shell {
		box-sizing: border-box;
		min-height: 100vh;
		padding: clamp(0.75rem, 2vw, 1.5rem) 1.25rem clamp(2rem, 5vw, 4rem);
		display: grid;
		align-content: start;
		gap: 2rem;
	}

	.intro,
	.card {
		width: min(100%, 38rem);
		margin: 0 auto;
	}

	.intro {
		display: grid;
		gap: 0.75rem;
	}

	h1,
	p {
		margin: 0;
	}

	h1 {
		font-size: clamp(2.8rem, 7vw, 5.5rem);
		font-weight: 400;
		line-height: 0.95;
	}

	.id,
	.card p {
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: rgba(17, 17, 17, 0.58);
	}

	.card {
		padding-top: 1rem;
		border-top: 1px solid rgba(17, 17, 17, 0.16);
		display: grid;
		gap: 1rem;
	}

	img {
		display: block;
		width: min(100%, 20rem);
		height: auto;
		background: transparent;
	}

	.link {
		word-break: break-all;
		color: rgba(17, 17, 17, 0.72);
	}
</style>
