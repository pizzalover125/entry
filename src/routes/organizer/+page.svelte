<script lang="ts">
	import { signIn, signOut } from '@auth/sveltekit/client';
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: ActionData | null }>();

	let createEventOpen = $state(false);
	let createEventInput = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (form?.message) {
			createEventOpen = true;
		}
	});

	$effect(() => {
		if (createEventOpen) {
			queueMicrotask(() => {
				createEventInput?.focus();
			});
		}
	});

	function openCreateEventModal() {
		createEventOpen = true;
	}

	function closeCreateEventModal() {
		createEventOpen = false;
	}
</script>

<svelte:head>
	<title>entry Organizer</title>
	<meta name="description" content="Organizer view for entry events." />
</svelte:head>

<div class="shell">
	<header class="intro">
		{#if data.session}
			<button
				type="button"
				class="corner-button"
				onclick={() => signOut({ redirectTo: resolve('/organizer') })}
			>
				Sign Out
			</button>
		{/if}

		<h1>Organizer</h1>
		{#if data.session?.user?.email}
			<p>{data.session.user.email}</p>
		{:else}
			<p>Google sign-in required</p>
		{/if}
	</header>

	{#if !data.session}
		<section class="panel auth-panel">
			{#if data.authConfigured}
				<p class="muted">
					Sign in with Google to manage events, copy registration links, and check people in.
				</p>
				<button
					type="button"
					onclick={() => signIn('google', { redirectTo: resolve('/organizer') })}
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
	{:else}
		<section class="actions create-event-bar">
			<button type="button" onclick={openCreateEventModal}>Create Event</button>

			{#if form?.message}
				<p class="error">{form.message}</p>
			{/if}
		</section>

		{#if data.events.length === 0}
			<section class="panel empty">
				<p class="muted">Create your first event to get a shareable registration form link.</p>

				{#if data.legacyEventCount > 0}
					<p class="muted">
						There {data.legacyEventCount === 1 ? 'is' : 'are'}
						{data.legacyEventCount}
						older unassigned {data.legacyEventCount === 1 ? 'event' : 'events'} in this database.
					</p>
					<form method="POST" action="?/claimLegacyEvents">
						<button type="submit">Claim Existing Events</button>
					</form>
				{/if}
			</section>
		{:else}
			<section class="panel events-panel">
				<div class="panel-head">
					<div>
						<p class="label">Events</p>
						<p class="meta">{data.events.length} total</p>
					</div>
					<p class="muted">Select an event to view its registrations.</p>
				</div>

				<div class="event-list">
					{#each data.events as event (event.id)}
						<a class="event-card" href={resolve('/organizer/[event]', { event: event.id })}>
							<p class="event-name">{event.name}</p>
							<p class="meta">{event.registrationCount} registrations</p>
							<p class="event-id">{event.id}</p>
						</a>
					{/each}
				</div>
			</section>

			{#if data.legacyEventCount > 0}
				<section class="panel legacy-panel">
					<p class="muted">
						There {data.legacyEventCount === 1 ? 'is' : 'are'}
						{data.legacyEventCount}
						unassigned older {data.legacyEventCount === 1 ? 'event' : 'events'} available to claim.
					</p>
					<form method="POST" action="?/claimLegacyEvents">
						<button type="submit">Claim Existing Events</button>
					</form>
				</section>
			{/if}
		{/if}
	{/if}
</div>

{#if data.session && createEventOpen}
	<div
		class="modal-backdrop"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) {
				closeCreateEventModal();
			}
		}}
	>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="create-event-title">
			<div class="panel-head">
				<div>
					<p class="label">New Event</p>
					<h2 id="create-event-title">Create an event</h2>
				</div>

				<button type="button" onclick={closeCreateEventModal}>Close</button>
			</div>

			<form method="POST" action="?/createEvent" class="create-event">
				<label>
					<span>Event Name</span>
					<input
						bind:this={createEventInput}
						name="name"
						placeholder="Spring Event"
						autocomplete="off"
						required
					/>
				</label>

				{#if form?.message}
					<p class="error">{form.message}</p>
				{/if}

				<div class="modal-actions">
					<button type="button" class="ghost-button" onclick={closeCreateEventModal}>
						Cancel
					</button>
					<button type="submit">Create Event</button>
				</div>
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
		min-height: 100vh;
		padding: clamp(1rem, 4vw, 4rem) clamp(0.9rem, 3vw, 1.25rem);
		display: grid;
		align-content: start;
		gap: 2rem;
	}

	.intro,
	.panel,
	.actions {
		width: 100%;
		box-sizing: border-box;
	}

	.intro,
	.actions,
	.panel {
		display: grid;
		gap: 0.75rem;
	}

	.intro {
		position: relative;
		padding-right: 8rem;
	}

	.panel {
		padding-top: 1rem;
		border-top: 1px solid rgba(17, 17, 17, 0.16);
	}

	h1,
	h2,
	p {
		margin: 0;
	}

	h1 {
		font-size: clamp(2.6rem, 7vw, 5rem);
		font-weight: 400;
		line-height: 0.95;
	}

	h2 {
		margin-top: 0.35rem;
		font-size: clamp(1.3rem, 3vw, 1.9rem);
		font-weight: 400;
		line-height: 1;
	}

	.intro p,
	.label,
	span,
	button,
	.meta,
	.muted {
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.intro p,
	.label,
	.meta,
	.muted {
		color: rgba(17, 17, 17, 0.58);
	}

	button {
		justify-self: start;
		padding: 0.85rem 1.15rem;
		border: 1px solid #111;
		background: #111;
		color: #fff;
		font: inherit;
		line-height: 1;
		cursor: pointer;
	}

	button:hover,
	.event-card:hover {
		opacity: 0.88;
	}

	.corner-button {
		position: absolute;
		top: 0;
		right: 0;
	}

	.create-event,
	.legacy-panel form {
		display: grid;
		gap: 1rem;
	}

	.create-event-bar {
		gap: 0.5rem;
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

	.panel-head,
	.modal-actions {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.event-list {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
	}

	.event-card {
		padding: 1rem;
		border: 1px solid rgba(17, 17, 17, 0.16);
		text-decoration: none;
		color: inherit;
		display: grid;
		gap: 0.4rem;
		background: rgba(255, 255, 255, 0.22);
	}

	.event-name {
		font-size: 1.15rem;
		line-height: 1.15;
	}

	.event-id {
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: rgba(17, 17, 17, 0.7);
	}

	.error {
		color: #8d2c1f;
		font-size: 0.95rem;
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
		width: min(100%, 34rem);
		max-height: min(100vh - 2.5rem, 42rem);
		overflow: auto;
		padding: 1.25rem 1.25rem 1.4rem;
		border: 1px solid rgba(17, 17, 17, 0.16);
		background: #f5f2eb;
		display: grid;
		gap: 1.25rem;
		box-shadow: 0 1.5rem 4rem rgba(17, 17, 17, 0.12);
	}

	.ghost-button {
		background: transparent;
		color: #111;
	}

	@media (max-width: 720px) {
		.shell {
			gap: 1.5rem;
		}

		h1 {
			font-size: clamp(2.6rem, 18vw, 4.2rem);
		}

		.intro {
			padding-right: 0;
		}

		.corner-button {
			position: static;
			justify-self: start;
			order: 3;
			margin-top: 0.5rem;
		}

		.panel-head,
		.modal-actions {
			flex-direction: column;
			align-items: flex-start;
		}

		.event-list {
			grid-template-columns: minmax(0, 1fr);
		}

		.event-card {
			padding: 0.9rem;
		}

		.modal-backdrop {
			padding: 0.75rem;
		}

		.modal {
			width: 100%;
			padding: 1rem;
		}

		.modal-actions,
		.modal-actions button,
		.create-event-bar button,
		.auth-panel button,
		.legacy-panel button {
			width: 100%;
		}

		.modal-actions button {
			justify-self: stretch;
		}
	}
</style>
