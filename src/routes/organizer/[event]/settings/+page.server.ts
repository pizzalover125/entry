import { env } from '$env/dynamic/private';
import { fail, redirect } from '@sveltejs/kit';

import { deleteEvent, getEventById, updateEventName } from '$lib/server/database';

import type { Actions, PageServerLoad } from './$types';

function getOrganizerEmail(session: Awaited<ReturnType<App.Locals['auth']>>) {
	return session?.user?.email?.trim().toLowerCase() ?? null;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const session = await locals.auth();
	const authConfigured = Boolean(env.AUTH_SECRET && env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
	const organizerEmail = getOrganizerEmail(session);

	if (!session?.user || !organizerEmail) {
		return {
			session: null,
			authConfigured,
			currentEvent: null
		};
	}

	const currentEvent = getEventById(params.event.toUpperCase(), organizerEmail);

	if (!currentEvent) {
		throw redirect(302, '/organizer');
	}

	return {
		session,
		authConfigured,
		currentEvent
	};
};

export const actions = {
	updateName: async ({ locals, params, request }) => {
		const session = await locals.auth();
		const organizerEmail = getOrganizerEmail(session);

		if (!session?.user || !organizerEmail) {
			throw redirect(303, '/organizer');
		}

		const name = String((await request.formData()).get('name') ?? '').trim();
		const eventId = params.event.toUpperCase();

		if (!name) {
			return fail(400, {
				message: 'Enter an event name.'
			});
		}

		const updated = updateEventName(eventId, name, organizerEmail);

		if (!updated) {
			throw redirect(303, '/organizer');
		}

		return {
			message: 'Event updated.'
		};
	},
	deleteEvent: async ({ locals, params }) => {
		const session = await locals.auth();
		const organizerEmail = getOrganizerEmail(session);

		if (!session?.user || !organizerEmail) {
			throw redirect(303, '/organizer');
		}

		deleteEvent(params.event.toUpperCase(), organizerEmail);
		throw redirect(303, '/organizer');
	}
} satisfies Actions;
