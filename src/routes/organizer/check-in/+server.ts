import { error, json } from '@sveltejs/kit';

import { getRegistrationById, setRegistrationChecked } from '$lib/server/database';

export async function POST({ request, locals }) {
	const session = await locals.auth();
	const organizerEmail = session?.user?.email?.trim().toLowerCase() ?? null;

	if (!session?.user || !organizerEmail) {
		throw error(401, 'Unauthorized.');
	}

	const contentType = request.headers.get('content-type') ?? '';
	const registrationId = contentType.includes('application/json')
		? String((await request.json()).registrationId ?? '')
				.trim()
				.toUpperCase()
		: String((await request.formData()).get('registrationId') ?? '')
				.trim()
				.toUpperCase();

	if (!registrationId) {
		throw error(400, 'Missing registration ID.');
	}

	const registration = getRegistrationById(registrationId, organizerEmail);

	if (!registration) {
		throw error(404, 'Registration not found.');
	}

	setRegistrationChecked(registrationId, true, organizerEmail);

	return json({
		success: true,
		registrationId,
		name: registration.name,
		alreadyChecked: registration.checked
	});
}
