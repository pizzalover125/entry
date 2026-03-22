<script lang="ts">
	import { signIn, signOut } from '@auth/sveltekit/client';
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	type QrCodeDetector = {
		detect(source: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>;
	};

	type QrCodeDetectorConstructor = new (options?: { formats?: string[] }) => QrCodeDetector;
	type BarcodeDetectorGlobal = typeof globalThis & {
		BarcodeDetector?: QrCodeDetectorConstructor;
	};
	const lofiPlaylistUrl =
		'https://soundcloud.com/reallofigirl/sets/lofi-girl-playlist-lofi-hip-hop-music-beats';
	const lofiEmbedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(lofiPlaylistUrl)}&color=%23111111&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&visual=false`;

	let checkedInCount = $state(0);
	let notCheckedInCount = $state(0);
	let scannerOpen = $state(false);
	let scannerMessage = $state<string | null>(null);
	let scannerError = $state<string | null>(null);
	let scannerInput = $state('');
	let isStartingScanner = $state(false);
	let isSubmittingScan = $state(false);
	let videoElement = $state<HTMLVideoElement | null>(null);

	let stream: MediaStream | null = null;
	let animationFrame: number | null = null;
	let detector: QrCodeDetector | null = null;
	let refreshInterval: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		checkedInCount = data.stats?.checkedIn ?? 0;
		notCheckedInCount = data.stats?.notCheckedIn ?? 0;
	});

	$effect(() => {
		if (!data.session || !data.currentEvent) {
			return;
		}

		refreshInterval = setInterval(() => {
			void refreshStats();
		}, 10000);

		return () => {
			if (refreshInterval) {
				clearInterval(refreshInterval);
				refreshInterval = null;
			}
		};
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}

		void stopScanner();
	});

	async function refreshStats() {
		if (!data.currentEvent) {
			return;
		}

		try {
			const response = await fetch(
				resolve('/organizer/[event]/mode/stats', { event: data.currentEvent.id }),
				{
					headers: {
						accept: 'application/json'
					}
				}
			);

			if (!response.ok) {
				return;
			}

			const payload = (await response.json()) as {
				checkedIn: number;
				notCheckedIn: number;
				total: number;
			};

			checkedInCount = payload.checkedIn;
			notCheckedInCount = payload.notCheckedIn;
		} catch {
			return;
		}
	}

	function extractRegistrationId(rawValue: string) {
		const value = rawValue.trim().toUpperCase();

		if (/^[A-Z0-9]{8}$/.test(value)) {
			return value;
		}

		if (value.startsWith('HTTP://') || value.startsWith('HTTPS://')) {
			try {
				const parsed = new URL(rawValue.trim());
				const segments = parsed.pathname.split('/').filter(Boolean);
				const candidate = segments.at(-1)?.toUpperCase() ?? '';

				if (/^[A-Z0-9]{8}$/.test(candidate)) {
					return candidate;
				}
			} catch {
				return null;
			}
		}

		const match = value.match(/([A-Z0-9]{8})/);

		return match?.[1] ?? null;
	}

	function updateCounts(alreadyChecked: boolean) {
		if (alreadyChecked) {
			return;
		}

		checkedInCount += 1;
		notCheckedInCount = Math.max(notCheckedInCount - 1, 0);
	}

	async function submitCheckIn(registrationId: string) {
		if (isSubmittingScan) {
			return;
		}

		isSubmittingScan = true;
		scannerError = null;

		try {
			const response = await fetch(resolve('/organizer/check-in'), {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ registrationId })
			});

			const payload = (await response.json()) as
				| { success: true; registrationId: string; name: string; alreadyChecked: boolean }
				| { message?: string };

			if (!response.ok || !('success' in payload)) {
				const message = 'message' in payload ? payload.message : undefined;
				throw new Error(message ?? 'Could not check in this registration.');
			}

			updateCounts(payload.alreadyChecked);
			scannerMessage = payload.alreadyChecked
				? `${payload.name} was already checked in.`
				: `${payload.name} is now checked in.`;
			scannerInput = '';
			await closeScanner();
		} catch (error) {
			scannerError =
				error instanceof Error ? error.message : 'Could not check in this registration.';
		} finally {
			isSubmittingScan = false;
		}
	}

	async function handleManualCheckIn() {
		const registrationId = extractRegistrationId(scannerInput);

		if (!registrationId) {
			scannerError = 'Enter a valid 8-character registration ID.';
			return;
		}

		await submitCheckIn(registrationId);
	}

	async function startScanner() {
		scannerMessage = null;
		scannerError = null;
		scannerOpen = true;
		isStartingScanner = true;

		const BarcodeDetectorApi = (globalThis as BarcodeDetectorGlobal).BarcodeDetector;

		if (!BarcodeDetectorApi || !navigator.mediaDevices?.getUserMedia) {
			scannerError = 'Camera scanning is not available here. You can still paste an ID below.';
			isStartingScanner = false;
			return;
		}

		try {
			detector = new BarcodeDetectorApi({ formats: ['qr_code'] });
			stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: { ideal: 'environment' }
				},
				audio: false
			});

			if (!videoElement) {
				throw new Error('Camera preview is not ready.');
			}

			videoElement.srcObject = stream;
			videoElement.setAttribute('playsinline', 'true');
			await videoElement.play();
			runScanLoop();
		} catch (error) {
			scannerError = error instanceof Error ? error.message : 'Could not start the camera scanner.';
			await stopScanner();
		} finally {
			isStartingScanner = false;
		}
	}

	function runScanLoop() {
		if (!scannerOpen || !detector || !videoElement || isSubmittingScan) {
			return;
		}

		animationFrame = requestAnimationFrame(async () => {
			if (
				!detector ||
				!videoElement ||
				videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
			) {
				runScanLoop();
				return;
			}

			try {
				const barcodes = await detector.detect(videoElement);
				const registrationId = extractRegistrationId(barcodes[0]?.rawValue ?? '');

				if (registrationId) {
					await submitCheckIn(registrationId);
					return;
				}
			} catch {
				scannerError = 'The camera is on, but QR scanning is not supported in this browser.';
				await stopScanner();
				return;
			}

			runScanLoop();
		});
	}

	async function stopScanner() {
		if (animationFrame !== null) {
			cancelAnimationFrame(animationFrame);
			animationFrame = null;
		}

		if (videoElement) {
			videoElement.pause();
			videoElement.srcObject = null;
		}

		if (stream) {
			for (const track of stream.getTracks()) {
				track.stop();
			}

			stream = null;
		}

		detector = null;
	}

	async function closeScanner() {
		scannerOpen = false;
		await stopScanner();
	}
</script>

<svelte:head>
	<title>{data.currentEvent ? `${data.currentEvent.name} Event Mode` : 'Event Mode'}</title>
	<meta name="description" content="Live event mode for organizer check-in." />
</svelte:head>

<div class="shell">
	<header class="intro">
		{#if data.session}
			<div class="header-actions">
				{#if data.currentEvent}
					<a href={resolve('/organizer/[event]', { event: data.currentEvent.id })} class="nav-link">
						Back
					</a>
					<a
						href={resolve('/organizer/[event]/settings', { event: data.currentEvent.id })}
						class="nav-link"
					>
						Settings
					</a>
				{/if}
				<button
					type="button"
					class="corner-button"
					onclick={() => signOut({ redirectTo: resolve('/organizer') })}
				>
					Sign Out
				</button>
			</div>
		{/if}

		<h1>{data.currentEvent?.name ?? 'Event Mode'}</h1>
		<p class="label">Event Mode</p>
	</header>

	{#if !data.session}
		<section class="panel auth-panel">
			{#if data.authConfigured}
				<p class="muted">Sign in with Google to use live event check-in.</p>
				<button
					type="button"
					onclick={() =>
						signIn('google', {
							redirectTo: data.currentEvent
								? resolve('/organizer/[event]/mode', { event: data.currentEvent.id })
								: resolve('/organizer')
						})}
				>
					Sign In with Google
				</button>
			{:else}
				<p class="muted">
					Google auth is not configured yet. Add `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and
					`AUTH_GOOGLE_SECRET` to enable organizer sign-in.
				</p>
			{/if}
		</section>
	{:else if data.currentEvent}
		<section class="stats-grid">
			<div class="stat-card">
				<p class="stat-label">Checked In</p>
				<p class="stat-value">{checkedInCount}</p>
			</div>

			<div class="stat-card">
				<p class="stat-label">Not Checked In</p>
				<p class="stat-value">{notCheckedInCount}</p>
			</div>

			<div class="stat-card action-card">
				<p class="stat-label">Check In</p>
				<button type="button" class="scan-button" onclick={startScanner}>Scan QR Code</button>
			</div>
		</section>

		{#if scannerMessage}
			<section class="status-panel">
				<p class="success">{scannerMessage}</p>
			</section>
		{/if}

		<section class="player-panel">
			<p class="label">Lofi Player</p>
			<iframe title="Lofi player" src={lofiEmbedUrl} loading="lazy" allow="autoplay"></iframe>
		</section>
	{/if}
</div>

{#if data.session && scannerOpen}
	<div
		class="modal-backdrop"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) {
				void closeScanner();
			}
		}}
	>
		<div
			class="modal scanner-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="scan-qr-title"
		>
			<div class="panel-head">
				<div>
					<p class="label">Check In</p>
					<h2 id="scan-qr-title">Scan QR code</h2>
				</div>

				<button type="button" onclick={closeScanner}>Close</button>
			</div>

			<video bind:this={videoElement} autoplay muted playsinline></video>

			{#if isStartingScanner}
				<p class="muted">Starting camera…</p>
			{/if}

			{#if scannerError}
				<p class="error">{scannerError}</p>
			{/if}

			<form
				class="manual-checkin"
				onsubmit={async (event) => {
					event.preventDefault();
					await handleManualCheckIn();
				}}
			>
				<label>
					<span>Manual ID</span>
					<input
						bind:value={scannerInput}
						placeholder="8-character ID"
						autocomplete="off"
						maxlength="8"
					/>
				</label>
				<button type="submit" disabled={isSubmittingScan}>
					{isSubmittingScan ? 'Checking In…' : 'Check In'}
				</button>
			</form>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		margin: 0;
		font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
		background: #f5f2eb;
		color: #111;
	}

	.shell {
		box-sizing: border-box;
		height: 100vh;
		padding: clamp(1rem, 4vw, 4rem) clamp(0.9rem, 3vw, 1.25rem);
		display: grid;
		align-content: start;
		gap: 2rem;
		overflow: hidden;
	}

	.intro,
	.auth-panel,
	.status-panel,
	.player-panel {
		width: 100%;
		box-sizing: border-box;
	}

	.intro,
	.auth-panel,
	.status-panel,
	.player-panel,
	.manual-checkin {
		display: grid;
		gap: 0.75rem;
	}

	.intro {
		position: relative;
		padding-right: 12rem;
	}

	h1,
	h2,
	p {
		margin: 0;
	}

	h1 {
		font-size: clamp(2.4rem, 7vw, 5rem);
		font-weight: 400;
		line-height: 0.95;
	}

	h2 {
		font-size: clamp(1.6rem, 3vw, 2.2rem);
		font-weight: 400;
		line-height: 1;
	}

	.label,
	span,
	button,
	.nav-link,
	.muted,
	.stat-label {
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.label,
	.muted,
	.stat-label {
		color: rgba(17, 17, 17, 0.58);
	}

	.header-actions {
		position: absolute;
		top: 0;
		right: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	button,
	.nav-link {
		justify-self: start;
		padding: 0.85rem 1.15rem;
		border: 1px solid #111;
		background: #111;
		color: #fff;
		font: inherit;
		line-height: 1;
		cursor: pointer;
		text-decoration: none;
	}

	button:hover,
	.nav-link:hover {
		opacity: 0.88;
	}

	.corner-button {
		position: static;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}

	.stat-card {
		padding: 1.2rem;
		border: 1px solid rgba(17, 17, 17, 0.16);
		background: rgba(255, 255, 255, 0.24);
		display: grid;
		gap: 0.75rem;
		align-content: start;
		min-height: 10.5rem;
	}

	.stat-value {
		font-size: clamp(3rem, 8vw, 5.5rem);
		line-height: 0.9;
	}

	.action-card {
		align-content: space-between;
	}

	.scan-button {
		align-self: end;
		padding: 1.2rem 1.6rem;
		font-size: 0.82rem;
	}

	.status-panel {
		padding-top: 1rem;
		border-top: 1px solid rgba(17, 17, 17, 0.16);
	}

	.player-panel {
		padding-top: 1rem;
		border-top: 1px solid rgba(17, 17, 17, 0.16);
	}

	iframe {
		display: block;
		width: 100%;
		height: 116px;
		border: 0;
	}

	.success,
	.error {
		font-size: 1rem;
	}

	.success {
		color: rgba(17, 17, 17, 0.82);
	}

	.error {
		color: #8d2c1f;
	}

	label {
		display: grid;
		gap: 0.55rem;
	}

	input {
		width: 100%;
		padding: 0 0 0.9rem;
		border: 0;
		border-bottom: 1px solid rgba(17, 17, 17, 0.2);
		border-radius: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 1rem;
		outline: none;
	}

	input:focus {
		border-bottom-color: #111;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 1.25rem;
		background: rgba(17, 17, 17, 0.2);
		z-index: 20;
	}

	.modal {
		width: min(100%, 40rem);
		max-height: min(100vh - 2.5rem, 42rem);
		overflow: auto;
		padding: 1.25rem;
		border: 1px solid rgba(17, 17, 17, 0.16);
		background: #f5f2eb;
		display: grid;
		gap: 1.25rem;
		box-shadow: 0 1.5rem 4rem rgba(17, 17, 17, 0.12);
	}

	.panel-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	video {
		display: block;
		width: 100%;
		aspect-ratio: 4 / 3;
		background: rgba(17, 17, 17, 0.08);
		object-fit: cover;
	}

	@media (max-width: 900px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.stat-card {
			min-height: 0;
		}

		iframe {
			height: 104px;
		}
	}

	@media (max-width: 720px) {
		.shell {
			gap: 1.5rem;
		}

		h1 {
			font-size: clamp(2.4rem, 16vw, 4rem);
		}

		.intro {
			padding-right: 0;
		}

		.header-actions {
			position: static;
			order: 3;
			margin-top: 0.5rem;
			width: 100%;
		}

		.header-actions > *,
		.auth-panel button,
		.scan-button,
		.manual-checkin button {
			width: 100%;
		}

		.scan-button {
			padding: 0.85rem 1.15rem;
			font-size: 0.72rem;
		}

		.modal-backdrop {
			padding: 0.75rem;
		}

		.modal {
			width: 100%;
			padding: 1rem;
		}

		.panel-head {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
