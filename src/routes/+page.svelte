<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: ActionData | null }>();

	const defaults = {
		name: 'John Doe',
		email: 'coolemail@gmail.com',
		phone: '1234567890',
		parentName: 'Jane Doe',
		parentEmail: 'anothercoolemail@gmail.com',
		parentPhone: '1234567891',
		age: '67',
		school: 'Hack Club'
	};
</script>

<svelte:head>
	<title>{data.hasEventParam ? 'Hackathon Registration' : 'entry'}</title>
	<meta
		name="description"
		content={data.hasEventParam
			? 'A minimalist hackathon management platform.'
			: 'entry organizer and event management.'}
	/>
</svelte:head>

<div class="shell">
	{#if !data.hasEventParam}
		<div class="home-intro">
			<p class="home-title">entry</p>
			<a class="home-link" href={resolve('/organizer')}>Sign In</a>
		</div>
	{:else if data.event}
		<div class="intro">
			<p class="event-name">{data.event.name}</p>
			<h1>Register</h1>
		</div>

		{#if form?.message}
			<p class:success={form.success} class="status">{form.message}</p>
		{/if}

		<form method="POST" class="form" novalidate>
			<section>
				<label>
					<span>Name</span>
					<input
						name="name"
						autocomplete="name"
						value={form?.values?.name ?? defaults.name}
						aria-invalid={form?.errors?.name ? 'true' : undefined}
						required
					/>
					{#if form?.errors?.name}
						<small>{form.errors.name}</small>
					{/if}
				</label>

				<label>
					<span>Email</span>
					<input
						type="email"
						name="email"
						autocomplete="email"
						value={form?.values?.email ?? defaults.email}
						aria-invalid={form?.errors?.email ? 'true' : undefined}
						required
					/>
					{#if form?.errors?.email}
						<small>{form.errors.email}</small>
					{/if}
				</label>

				<label>
					<span>Phone Number</span>
					<input
						type="tel"
						name="phone"
						autocomplete="tel"
						value={form?.values?.phone ?? defaults.phone}
						aria-invalid={form?.errors?.phone ? 'true' : undefined}
					/>
					{#if form?.errors?.phone}
						<small>{form.errors.phone}</small>
					{/if}
				</label>

				<div class="split">
					<label>
						<span>Age</span>
						<input
							type="number"
							name="age"
							min="5"
							max="120"
							inputmode="numeric"
							value={form?.values?.age ?? defaults.age}
							aria-invalid={form?.errors?.age ? 'true' : undefined}
							required
						/>
						{#if form?.errors?.age}
							<small>{form.errors.age}</small>
						{/if}
					</label>

					<label>
						<span>School</span>
						<input
							name="school"
							autocomplete="organization"
							value={form?.values?.school ?? defaults.school}
							aria-invalid={form?.errors?.school ? 'true' : undefined}
							required
						/>
						{#if form?.errors?.school}
							<small>{form.errors.school}</small>
						{/if}
					</label>
				</div>
			</section>

			<section>
				<label>
					<span>Parent Name</span>
					<input
						name="parentName"
						autocomplete="name"
						value={form?.values?.parentName ?? defaults.parentName}
						aria-invalid={form?.errors?.parentName ? 'true' : undefined}
						required
					/>
					{#if form?.errors?.parentName}
						<small>{form.errors.parentName}</small>
					{/if}
				</label>

				<label>
					<span>Parent Email</span>
					<input
						type="email"
						name="parentEmail"
						autocomplete="email"
						value={form?.values?.parentEmail ?? defaults.parentEmail}
						aria-invalid={form?.errors?.parentEmail ? 'true' : undefined}
						required
					/>
					{#if form?.errors?.parentEmail}
						<small>{form.errors.parentEmail}</small>
					{/if}
				</label>

				<label>
					<span>Parent Phone Number</span>
					<input
						type="tel"
						name="parentPhone"
						autocomplete="tel"
						value={form?.values?.parentPhone ?? defaults.parentPhone}
						aria-invalid={form?.errors?.parentPhone ? 'true' : undefined}
						required
					/>
					{#if form?.errors?.parentPhone}
						<small>{form.errors.parentPhone}</small>
					{/if}
				</label>
			</section>

			<button type="submit">Submit</button>
		</form>
	{:else}
		<div class="intro">
			<p class="event-name">Registration</p>
			<h1>Invalid Link</h1>
		</div>

		<p class="status">This form link is missing an event or the event no longer exists.</p>
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
		box-sizing: border-box;
		min-height: 100vh;
		padding: clamp(1rem, 3vw, 2rem) 1.25rem clamp(2rem, 5vw, 4rem);
		display: grid;
		align-content: start;
		gap: 2rem;
	}

	.intro,
	.form,
	.home-intro {
		width: min(100%, 38rem);
		margin: 0 auto;
	}

	.intro {
		display: grid;
		gap: 0;
	}

	.home-intro {
		display: grid;
		align-content: start;
		justify-items: start;
		gap: 1.5rem;
		width: 100%;
	}

	span,
	button,
	small,
	.status,
	.home-link,
	.home-title {
		letter-spacing: 0.04em;
	}

	span,
	button,
	.home-link {
		text-transform: uppercase;
		font-size: 0.72rem;
	}

	h1 {
		margin: 0;
		font-size: clamp(2.8rem, 7vw, 5.5rem);
		font-weight: 400;
		line-height: 0.95;
	}

	.event-name {
		margin: 0;
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: rgba(17, 17, 17, 0.58);
	}

	.home-title {
		margin: 0;
		font-size: clamp(4.5rem, 18vw, 12rem);
		font-weight: 400;
		line-height: 0.85;
		text-transform: uppercase;
		color: #111;
	}

	.home-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-top: 1rem;
		padding: 1.15rem 1.6rem;
		border: 1px solid #111;
		background: #111;
		color: #fff;
		text-decoration: none;
		font-size: 0.82rem;
	}

	.home-link:hover {
		opacity: 0.88;
	}

	.status {
		margin: 0;
		max-width: 26rem;
		font-size: 0.95rem;
		color: rgba(17, 17, 17, 0.72);
	}

	.status {
		width: min(100%, 38rem);
		margin: 0 auto;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(17, 17, 17, 0.16);
	}

	.status.success {
		color: #111;
	}

	.form,
	section {
		display: grid;
		gap: 1.25rem;
	}

	.form {
		padding-top: 0.25rem;
	}

	label {
		display: grid;
		gap: 0.55rem;
	}

	span {
		color: rgba(17, 17, 17, 0.65);
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
		transition: border-color 140ms ease;
	}

	input:focus {
		border-bottom-color: #111;
	}

	input[aria-invalid='true'] {
		border-bottom-color: #8d2c1f;
	}

	small {
		font-size: 0.72rem;
		color: #8d2c1f;
	}

	button {
		justify-self: start;
		padding: 0.85rem 1.15rem;
		border: 1px solid #111;
		background: #111;
		color: #fff;
		font: inherit;
		cursor: pointer;
		line-height: 1;
	}

	button:hover {
		opacity: 0.88;
	}

	.split {
		display: grid;
		gap: 1.25rem;
	}

	@media (min-width: 640px) {
		.split {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
