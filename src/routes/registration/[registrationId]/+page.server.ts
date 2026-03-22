import { error } from '@sveltejs/kit';
import QRCode from 'qrcode';

import { getRegistrationById } from '$lib/server/database';

export async function load({ params, url }) {
	const registration = getRegistrationById(params.registrationId);

	if (!registration) {
		throw error(404, 'Registration not found.');
	}

	const registrationUrl = `${url.origin}/registration/${registration.registrationId}`;
	const qrCodeDataUrl = await QRCode.toDataURL(registrationUrl, {
		margin: 1,
		width: 320,
		color: {
			dark: '#111111',
			light: '#f5f2eb'
		}
	});

	return {
		registrationId: registration.registrationId,
		registrationUrl,
		qrCodeDataUrl
	};
}
