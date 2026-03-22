import { env } from '$env/dynamic/private';

import QRCode from 'qrcode';

import { registrationQrCodeOptions } from '$lib/registration';

type RegistrationConfirmationEmail = {
	eventName: string;
	registrationId: string;
	registrationUrl: string;
	studentName: string;
	studentEmail: string;
	parentEmail: string;
};

type MailConfiguration = {
	apiUrl: string;
	fromAddress: string;
	fromName: string;
	sendMailToken: string;
};

const defaultFromAddress = 'adi@codehatch.org';
const defaultFromName = 'Aaradhya Panda';
const defaultApiUrl = 'https://api.zeptomail.com/v1.1/email';

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function getMailConfiguration(): MailConfiguration | null {
	const sendMailToken = env.ZEPTOMAIL_SEND_MAIL_TOKEN?.trim();

	if (!sendMailToken) {
		return null;
	}

	return {
		apiUrl: env.ZEPTOMAIL_API_URL?.trim() || defaultApiUrl,
		fromAddress: env.MAIL_FROM_ADDRESS?.trim() || defaultFromAddress,
		fromName: env.MAIL_FROM_NAME?.trim() || defaultFromName,
		sendMailToken
	};
}

function formatRecipientList(studentEmail: string, parentEmail: string) {
	const recipients: string[] = [];
	const seen = new Set<string>();

	for (const email of [studentEmail, parentEmail]) {
		const normalizedEmail = email.trim().toLowerCase();

		if (!normalizedEmail || seen.has(normalizedEmail)) {
			continue;
		}

		seen.add(normalizedEmail);
		recipients.push(email.trim());
	}

	return recipients;
}

function createRecipient(address: string, name: string) {
	return {
		email_address: {
			address,
			name
		}
	};
}

async function readErrorMessage(response: Response) {
	const bodyText = await response.text();

	try {
		const body = JSON.parse(bodyText) as {
			error?: { message?: string };
			message?: string;
		};

		return body.error?.message || body.message || bodyText;
	} catch {
		return bodyText;
	}
}

export async function sendRegistrationConfirmationEmail({
	eventName,
	registrationId,
	registrationUrl,
	studentName,
	studentEmail,
	parentEmail
}: RegistrationConfirmationEmail) {
	const configuration = getMailConfiguration();

	if (!configuration) {
		console.warn('Registration confirmation email skipped because ZeptoMail is not configured.');

		return { skipped: true, sent: false };
	}

	const recipients = formatRecipientList(studentEmail, parentEmail);

	if (recipients.length === 0) {
		return { skipped: true, sent: false };
	}

	const qrCodeBuffer = await QRCode.toBuffer(registrationUrl, registrationQrCodeOptions);
	const qrCodeBase64 = qrCodeBuffer.toString('base64');
	const [to, ...bccRecipients] = recipients;
	const safeEventName = escapeHtml(eventName);
	const safeStudentName = escapeHtml(studentName);
	const safeRegistrationUrl = escapeHtml(registrationUrl);

	const response = await fetch(configuration.apiUrl, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Zoho-enczapikey ${configuration.sendMailToken}`
		},
		body: JSON.stringify({
			from: {
				address: configuration.fromAddress,
				name: configuration.fromName
			},
			to: [createRecipient(to, studentName)],
			bcc: bccRecipients.map((address) => createRecipient(address, 'Parent')),
			subject: `Registration confirmed for ${eventName}`,
			textbody: [
				`Hi ${studentName},`,
				'',
				`Your registration for ${eventName} is confirmed.`,
				`Registration ID: ${registrationId}`,
				`QR Code Link: ${registrationUrl}`,
				'',
				'Bring this QR code with you at check-in.',
				'',
				'See you soon,',
				'entry'
			].join('\n'),
			htmlbody: [
				`<p>Hi ${safeStudentName},</p>`,
				`<p>Your registration for <strong>${safeEventName}</strong> is confirmed.</p>`,
				'<p>Bring this QR code with you at check-in.</p>',
				'<p><img src="cid:registration-qr" alt="Registration QR code" width="220" height="220" /></p>',
				`<p><a href="${safeRegistrationUrl}">${safeRegistrationUrl}</a></p>`,
				'<p>See you soon,<br />Aaradhya Panda</p>'
			].join(''),
			inline_images: [
				{
					cid: 'registration-qr',
					content: qrCodeBase64,
					mime_type: 'image/png'
				}
			],
			attachments: [
				{
					name: `${registrationId}.png`,
					content: qrCodeBase64,
					mime_type: 'image/png'
				}
			],
			track_clicks: false,
			track_opens: false,
			client_reference: registrationId
		})
	});

	if (!response.ok) {
		throw new Error(
			`ZeptoMail API error (${response.status}): ${await readErrorMessage(response)}`
		);
	}

	return { skipped: false, sent: true };
}
