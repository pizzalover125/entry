import { error } from '@sveltejs/kit';
import QRCode from 'qrcode';

import { registrationQrCodeOptions } from '$lib/registration';
import { getRegistrationById } from '$lib/server/database';

export async function load({ params, url }) {
	const registration = getRegistrationById(params.registrationId);

	if (!registration) {
		throw error(404, 'Registration not found.');
	}

	const registrationUrl = `${url.origin}/registration/${registration.registrationId}`;
	const qrCodeDataUrl = await QRCode.toDataURL(registrationUrl, registrationQrCodeOptions);

	return {
		registrationId: registration.registrationId,
		registrationUrl,
		qrCodeDataUrl
	};
}
