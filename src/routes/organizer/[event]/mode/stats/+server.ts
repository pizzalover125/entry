import { error, json } from '@sveltejs/kit';

import { getCheckInStats, getEventById } from '$lib/server/database';

function getOrganizerEmail(session: Awaited<ReturnType<App.Locals['auth']>>) {
	return session?.user?.email?.trim().toLowerCase() ?? null;
}

export async function GET({ locals, params }) {
	const session = await locals.auth();
	const organizerEmail = getOrganizerEmail(session);

	if (!session?.user || !organizerEmail) {
		throw error(401, 'Unauthorized.');
	}

	const currentEvent = getEventById(params.event.toUpperCase(), organizerEmail);

	if (!currentEvent) {
		throw error(404, 'Event not found.');
	}

	return json(getCheckInStats(currentEvent.id, organizerEmail));
}
