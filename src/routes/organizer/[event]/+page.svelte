<script lang="ts">
	import { signIn, signOut } from '@auth/sveltekit/client';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	type RegistrationRow = PageData['registrations'][number];
	type OrganizerEventRoute = `/organizer/${string}`;

	let registrations = $derived<RegistrationRow[]>([...data.registrations]);
	let organizerPath = $derived<OrganizerEventRoute | '/organizer'>(
		data.currentEvent ? (`/organizer/${data.currentEvent.id}` as OrganizerEventRoute) : '/organizer'
	);
	let copyMessage = $state<string | null>(null);

	async function copyCurrentLink() {
		if (!data.currentEvent?.formUrl) {
			return;
		}

		try {
			await navigator.clipboard.writeText(data.currentEvent.formUrl);
			copyMessage = 'Form link copied.';
		} catch {
			copyMessage = 'Could not copy the form link.';
		}
	}
</script>

<svelte:head>
	<title>{data.currentEvent ? `${data.currentEvent.name} | Organizer` : 'Organizer'}</title>
	<meta name="description" content="Organizer view for an event's registrations." />
</svelte:head>

<div class="shell">
	<header class="intro">
		{#if data.session}
			<div class="header-actions">
				<a href={resolve('/organizer')} class="nav-link">Back</a>
				{#if data.currentEvent}
					<a
						href={resolve('/organizer/[event]/settings', { event: data.currentEvent.id })}
						class="nav-link"
					>
						Settings
					</a>
					<a
						href={resolve('/organizer/[event]/mode', { event: data.currentEvent.id })}
						class="nav-link"
					>
						Event Mode
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

		<h1>{data.currentEvent?.name ?? 'Organizer'}</h1>
	</header>

	{#if !data.session}
		<section class="panel auth-panel">
			{#if data.authConfigured}
				<p class="muted">
					Sign in with Google to manage events, copy registration links, and check people in.
				</p>
				<button
					type="button"
					onclick={() => signIn('google', { redirectTo: resolve(organizerPath) })}
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
		<section class="panel link-panel">
			<div class="panel-head">
				<div>
					<p class="label">Form Link</p>
				</div>
				<div class="panel-actions">
					<button type="button" onclick={copyCurrentLink}>Copy Link</button>
				</div>
			</div>

			<input value={data.currentEvent.formUrl} readonly class="link-input" />

			{#if copyMessage}
				<p class="muted">{copyMessage}</p>
			{/if}
		</section>

		<section class="table-shell">
			<div class="table-header">
				<div>
					<p class="label">Rows</p>
					{#if data.pagination}
						<p class="meta">
							{data.pagination.startRow}-{data.pagination.endRow} of {data.pagination.total}
						</p>
					{/if}
				</div>

				<div>
					<p class="label">Page Size</p>
					<p class="meta">{data.pagination?.pageSize ?? 10}</p>
				</div>
			</div>

			{#if registrations.length === 0}
				<p class="empty-copy">No registrations for this event yet.</p>
			{:else}
				<div class="table-wrap">
					<table>
						<thead>
							<tr>
								<th>#</th>
								<th>Checked In</th>
								<th>ID</th>
								<th>Name</th>
								<th>Email</th>
								<th>Phone</th>
								<th>Parent Name</th>
								<th>Parent Email</th>
								<th>Parent Phone</th>
								<th>Age</th>
								<th>School</th>
								<th>Submitted</th>
							</tr>
						</thead>
						<tbody>
							{#each registrations as registration, index (registration.registrationId)}
								<tr>
									<td data-label="Row">{(data.pagination?.startRow ?? 1) + index}</td>
									<td data-label="Checked In">
										<form method="POST" action="?/toggleChecked" class="check-form">
											<input
												type="hidden"
												name="registrationId"
												value={registration.registrationId}
											/>
											<input type="hidden" name="page" value={data.pagination?.page ?? 1} />
											<input
												type="checkbox"
												name="checked"
												checked={registration.checked}
												aria-label={`Mark ${registration.name} as checked in`}
												onchange={(event) =>
													(event.currentTarget as HTMLInputElement).form?.requestSubmit()}
											/>
										</form>
									</td>
									<td data-label="ID"><span class="pill">{registration.registrationId}</span></td>
									<td data-label="Name">{registration.name}</td>
									<td data-label="Email">{registration.email}</td>
									<td data-label="Phone">{registration.phone || 'Optional'}</td>
									<td data-label="Parent Name">{registration.parentName}</td>
									<td data-label="Parent Email">{registration.parentEmail}</td>
									<td data-label="Parent Phone">{registration.parentPhone}</td>
									<td data-label="Age">{registration.age}</td>
									<td data-label="School">{registration.school}</td>
									<td data-label="Submitted">{registration.createdAt}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			{#if data.pagination}
				<div class="table-footer">
					<p class="meta">Page {data.pagination.page} of {data.pagination.totalPages}</p>

					<nav class="pagination" aria-label="Pagination">
						{#if data.pagination.hasPreviousPage}
							<form method="GET" action={resolve(`/organizer/${data.currentEvent.id}`)}>
								<input type="hidden" name="page" value={data.pagination.page - 1} />
								<button type="submit">Previous</button>
							</form>
						{:else}
							<span class="disabled">Previous</span>
						{/if}

						{#if data.pagination.hasNextPage}
							<form method="GET" action={resolve(`/organizer/${data.currentEvent.id}`)}>
								<input type="hidden" name="page" value={data.pagination.page + 1} />
								<button type="submit">Next</button>
							</form>
						{:else}
							<span class="disabled">Next</span>
						{/if}
					</nav>
				</div>
			{/if}
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
	.panel,
	.table-shell {
		width: 100%;
		box-sizing: border-box;
	}

	.intro,
	.panel {
		display: grid;
		gap: 0.75rem;
	}

	.intro {
		position: relative;
		padding-right: 8rem;
	}

	.panel,
	.table-shell {
		padding-top: 1rem;
		border-top: 1px solid rgba(17, 17, 17, 0.16);
	}

	h1,
	p,
	table {
		margin: 0;
	}

	h1 {
		font-size: clamp(2.6rem, 7vw, 5rem);
		font-weight: 400;
		line-height: 0.95;
	}

	.label,
	th,
	span,
	button,
	.nav-link,
	.meta,
	.muted {
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.label,
	th,
	.muted,
	.meta {
		color: rgba(17, 17, 17, 0.58);
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

	.header-actions {
		position: absolute;
		top: 0;
		right: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.corner-button {
		position: static;
	}

	.link-panel {
		gap: 1rem;
	}

	.panel-head,
	.table-header,
	.table-footer {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.panel-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.check-form,
	.pagination form {
		margin: 0;
	}

	.link-input {
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

	.link-input:focus {
		border-bottom-color: #111;
	}

	.table-shell {
		border: 1px solid rgba(17, 17, 17, 0.16);
	}

	.table-header,
	.table-footer {
		padding: 1rem 1.25rem;
	}

	.table-wrap {
		overflow-x: auto;
		padding: 0 1.25rem;
		scrollbar-width: thin;
		scrollbar-color: rgba(17, 17, 17, 0.35) rgba(17, 17, 17, 0.08);
	}

	td::before {
		content: none;
	}

	.table-wrap::-webkit-scrollbar {
		height: 0.7rem;
	}

	.table-wrap::-webkit-scrollbar-track {
		background: rgba(17, 17, 17, 0.08);
	}

	.table-wrap::-webkit-scrollbar-thumb {
		background: rgba(17, 17, 17, 0.35);
		border-radius: 999px;
		border: 2px solid #f5f2eb;
	}

	.table-wrap::-webkit-scrollbar-thumb:hover {
		background: rgba(17, 17, 17, 0.5);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 88rem;
	}

	thead {
		background: rgba(17, 17, 17, 0.03);
	}

	th,
	td {
		padding: 0.95rem 1rem;
		text-align: left;
		border-bottom: 1px solid rgba(17, 17, 17, 0.08);
		white-space: nowrap;
		font-size: 0.94rem;
	}

	th {
		position: sticky;
		top: 0;
		z-index: 1;
		background: #ece8df;
	}

	tbody tr:hover {
		background: rgba(17, 17, 17, 0.025);
	}

	input[type='checkbox'] {
		width: 1rem;
		height: 1rem;
		margin: 0;
		accent-color: #111;
		cursor: pointer;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		padding: 0.28rem 0.5rem;
		border-radius: 999px;
		background: rgba(17, 17, 17, 0.08);
		color: #111;
	}

	.pagination {
		display: grid;
		grid-auto-flow: column;
		gap: 0.75rem;
	}

	.pagination span {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.7rem 1rem;
		border: 1px solid #111;
		background: #111;
		color: #fff;
		opacity: 0.35;
	}

	.empty-copy {
		padding: 1.25rem;
		color: rgba(17, 17, 17, 0.68);
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

		.panel-head,
		.table-header,
		.table-footer {
			flex-direction: column;
			align-items: flex-start;
		}

		.header-actions,
		.panel-actions,
		.pagination {
			width: 100%;
		}

		.header-actions > *,
		.panel-actions > *,
		.panel-actions button,
		.pagination > *,
		.pagination form,
		.pagination button,
		.auth-panel button {
			width: 100%;
		}

		.table-header,
		.table-footer {
			padding: 1rem;
		}

		.table-wrap {
			padding: 0;
			overflow: visible;
		}

		table,
		thead,
		tbody,
		tr,
		td {
			display: block;
			min-width: 0;
		}

		thead {
			display: none;
		}

		tbody {
			display: grid;
			gap: 0.9rem;
			padding: 0 1rem 1rem;
		}

		tr {
			border: 1px solid rgba(17, 17, 17, 0.12);
			background: rgba(255, 255, 255, 0.26);
		}

		td {
			display: grid;
			grid-template-columns: minmax(6.25rem, 7.5rem) minmax(0, 1fr);
			gap: 0.75rem;
			align-items: center;
			padding: 0.8rem 0.9rem;
			white-space: normal;
		}

		td::before {
			content: attr(data-label);
			font-size: 0.68rem;
			letter-spacing: 0.04em;
			text-transform: uppercase;
			color: rgba(17, 17, 17, 0.58);
		}

		.check-form {
			display: flex;
			justify-content: flex-start;
		}

		.pagination {
			grid-auto-flow: row;
		}

		.empty-copy {
			padding: 1rem;
		}
	}
</style>
