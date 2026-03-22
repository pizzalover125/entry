<script lang="ts">
	import { signIn, signOut } from '@auth/sveltekit/client';
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: ActionData | null }>();
</script>

<svelte:head>
	<title>{data.currentEvent ? `${data.currentEvent.name} Settings` : 'Event Settings'}</title>
	<meta name="description" content="Organizer event settings." />
</svelte:head>

<div class="shell">
	<header class="intro">
		{#if data.session && data.currentEvent}
			<div class="header-actions">
				<a href={resolve('/organizer/[event]', { event: data.currentEvent.id })} class="nav-link">
					Back
				</a>
				<button
					type="button"
					class="corner-button"
					onclick={() => signOut({ redirectTo: resolve('/organizer') })}
				>
					Sign Out
				</button>
			</div>
		{/if}

		<h1>{data.currentEvent?.name ?? 'Settings'}</h1>
		<p class="label">Settings</p>
	</header>

	{#if !data.session}
		<section class="panel auth-panel">
			{#if data.authConfigured}
				<p class="muted">Sign in with Google to update or delete this event.</p>
				<button
					type="button"
					onclick={() =>
						signIn('google', {
							redirectTo: data.currentEvent
								? resolve('/organizer/[event]/settings', { event: data.currentEvent.id })
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
		<section class="panel">
			<div>
				<p class="label">Rename Event</p>
			</div>

			<form method="POST" action="?/updateName" class="settings-form">
				<label>
					<span>Event Name</span>
					<input
						name="name"
						value={form?.message ? undefined : data.currentEvent.name}
						placeholder={data.currentEvent.name}
						autocomplete="off"
						required
					/>
				</label>

				{#if form?.message}
					<p class={form.message === 'Event updated.' ? 'success' : 'error'}>{form.message}</p>
				{/if}

				<button type="submit">Save Changes</button>
			</form>
		</section>

		<section class="panel danger-panel">
			<div>
				<p class="label">Delete Event</p>
			</div>

			<form
				method="POST"
				action="?/deleteEvent"
				class="settings-form"
				onsubmit={(event) => {
					if (!confirm('Delete this event and all its registrations?')) {
						event.preventDefault();
					}
				}}
			>
				<button type="submit">Delete Event</button>
			</form>
		</section>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
		background: #f5f2eb;
		color: #111;
	}

	.shell {
		min-height: 100vh;
		padding: clamp(1rem, 4vw, 4rem) clamp(0.9rem, 3vw, 1.25rem);
		display: grid;
		align-content: start;
		gap: 2rem;
	}

	.intro,
	.panel {
		width: 100%;
		box-sizing: border-box;
	}

	.intro,
	.panel,
	.settings-form {
		display: grid;
		gap: 0.75rem;
	}

	.intro {
		position: relative;
		padding-right: 9rem;
	}

	.panel {
		padding-top: 1rem;
		border-top: 1px solid rgba(17, 17, 17, 0.16);
	}

	h1,
	p {
		margin: 0;
	}

	h1 {
		font-size: clamp(2.4rem, 7vw, 5rem);
		font-weight: 400;
		line-height: 0.95;
	}

	.label,
	span,
	button,
	.nav-link,
	.muted {
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.label,
	.muted {
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

	.error,
	.success {
		font-size: 0.95rem;
	}

	.error {
		color: #8d2c1f;
	}

	.success {
		color: rgba(17, 17, 17, 0.82);
	}

	.danger-panel {
		gap: 1rem;
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
		.settings-form button,
		.auth-panel button {
			width: 100%;
		}
	}
</style>
