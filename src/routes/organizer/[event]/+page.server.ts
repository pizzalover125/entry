import { env } from '$env/dynamic/private';
import { fail, redirect } from '@sveltejs/kit';

import {
	countRegistrations,
	getEventById,
	listRegistrationsPage,
	setRegistrationChecked
} from '$lib/server/database';

import type { Actions, PageServerLoad } from './$types';

const pageSize = 10;

function getOrganizerEmail(session: Awaited<ReturnType<App.Locals['auth']>>) {
	return session?.user?.email?.trim().toLowerCase() ?? null;
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const session = await locals.auth();
	const authConfigured = Boolean(env.AUTH_SECRET && env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
	const organizerEmail = getOrganizerEmail(session);

	if (!session?.user || !organizerEmail) {
		return {
			session: null,
			authConfigured,
			currentEvent: null,
			registrations: [],
			pagination: null
		};
	}

	const currentEvent = getEventById(params.event.toUpperCase(), organizerEmail);

	if (!currentEvent) {
		throw redirect(302, '/organizer');
	}

	const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
	const total = countRegistrations(currentEvent.id, organizerEmail);
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const page = Number.isInteger(requestedPage)
		? Math.min(Math.max(requestedPage, 1), totalPages)
		: 1;
	const offset = (page - 1) * pageSize;
	const registrations = listRegistrationsPage(currentEvent.id, pageSize, offset, organizerEmail);

	return {
		session,
		authConfigured,
		currentEvent: {
			...currentEvent,
			formUrl: `${url.origin}/?event=${currentEvent.id}`
		},
		registrations,
		pagination: {
			page,
			pageSize,
			total,
			totalPages,
			hasPreviousPage: page > 1,
			hasNextPage: page < totalPages,
			startRow: total === 0 ? 0 : offset + 1,
			endRow: offset + registrations.length
		}
	};
};

export const actions = {
	toggleChecked: async ({ locals, params, request }) => {
		const session = await locals.auth();
		const organizerEmail = getOrganizerEmail(session);

		if (!session?.user || !organizerEmail) {
			throw redirect(303, '/organizer');
		}

		const formData = await request.formData();
		const registrationId = String(formData.get('registrationId') ?? '').trim();
		const page = Number.parseInt(String(formData.get('page') ?? '1'), 10);

		if (!registrationId) {
			return fail(400, {
				message: 'Missing registration information.'
			});
		}

		setRegistrationChecked(registrationId, formData.has('checked'), organizerEmail);

		throw redirect(
			303,
			`/organizer/${params.event.toUpperCase()}?page=${Number.isInteger(page) && page > 0 ? page : 1}`
		);
	}
} satisfies Actions;
