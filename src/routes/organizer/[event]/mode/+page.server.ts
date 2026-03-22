import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';

import { getCheckInStats, getEventById } from '$lib/server/database';

import type { PageServerLoad } from './$types';

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
			currentEvent: null,
			stats: null
		};
	}

	const currentEvent = getEventById(params.event.toUpperCase(), organizerEmail);

	if (!currentEvent) {
		throw redirect(302, '/organizer');
	}

	return {
		session,
		authConfigured,
		currentEvent,
		stats: getCheckInStats(currentEvent.id, organizerEmail)
	};
};
