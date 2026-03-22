import { env } from '$env/dynamic/private';
import { fail, redirect } from '@sveltejs/kit';

import {
	claimUnownedEvents,
	countUnownedEvents,
	createEvent,
	listEvents
} from '$lib/server/database';

import type { Actions, PageServerLoad } from './$types';

function getOrganizerEmail(session: Awaited<ReturnType<App.Locals['auth']>>) {
	return session?.user?.email?.trim().toLowerCase() ?? null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = await locals.auth();
	const authConfigured = Boolean(env.AUTH_SECRET && env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
	const organizerEmail = getOrganizerEmail(session);

	if (!session?.user || !organizerEmail) {
		return {
			session: null,
			authConfigured,
			events: [],
			legacyEventCount: 0
		};
	}

	const selectedEventId = url.searchParams.get('event')?.trim().toUpperCase() ?? '';
	const selectedPage = url.searchParams.get('page')?.trim() ?? '';

	if (selectedEventId) {
		const pageQuery = selectedPage ? `?page=${encodeURIComponent(selectedPage)}` : '';
		throw redirect(302, `/organizer/${selectedEventId}${pageQuery}`);
	}

	return {
		session,
		authConfigured,
		events: listEvents(organizerEmail).map((event) => ({
			...event,
			formUrl: `${url.origin}/?event=${event.id}`,
			organizerPath: `/organizer/${event.id}`
		})),
		legacyEventCount: countUnownedEvents()
	};
};

export const actions = {
	createEvent: async ({ locals, request }) => {
		const session = await locals.auth();
		const organizerEmail = getOrganizerEmail(session);

		if (!session?.user || !organizerEmail) {
			throw redirect(303, '/organizer');
		}

		const formData = await request.formData();
		const name = String(formData.get('name') ?? '').trim();

		if (!name) {
			return fail(400, {
				message: 'Enter an event name.'
			});
		}

		const event = createEvent(name, organizerEmail);
		throw redirect(303, `/organizer/${event.id}`);
	},
	claimLegacyEvents: async ({ locals }) => {
		const session = await locals.auth();
		const organizerEmail = getOrganizerEmail(session);

		if (!session?.user || !organizerEmail) {
			throw redirect(303, '/organizer');
		}

		claimUnownedEvents(organizerEmail);
		throw redirect(303, '/organizer');
	}
} satisfies Actions;
