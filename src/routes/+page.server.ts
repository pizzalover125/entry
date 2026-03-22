import { fail, redirect } from '@sveltejs/kit';

import { createRegistration, getEventById } from '$lib/server/database';
import { sendRegistrationConfirmationEmail } from '$lib/server/email';

import type { Actions, PageServerLoad } from './$types';

type FormValues = {
	name: string;
	email: string;
	phone: string;
	parentName: string;
	parentEmail: string;
	parentPhone: string;
	age: string;
	school: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function readValue(formData: FormData, key: keyof FormValues) {
	return String(formData.get(key) ?? '').trim();
}

function validate(values: FormValues) {
	const errors: FormErrors = {};
	const age = Number.parseInt(values.age, 10);

	if (!values.name) errors.name = 'Enter the student name.';
	if (!values.email) errors.email = 'Enter the student email.';
	else if (!emailPattern.test(values.email)) errors.email = 'Enter a valid email.';
	if (values.phone && values.phone.length < 7) errors.phone = 'Enter a valid phone number.';
	if (!values.parentName) errors.parentName = 'Enter the parent name.';
	if (!values.parentEmail) errors.parentEmail = 'Enter the parent email.';
	else if (!emailPattern.test(values.parentEmail)) errors.parentEmail = 'Enter a valid email.';
	if (!values.parentPhone) errors.parentPhone = 'Enter the parent phone number.';
	else if (values.parentPhone.length < 7) errors.parentPhone = 'Enter a valid phone number.';
	if (!values.age) errors.age = 'Enter the student age.';
	else if (!Number.isInteger(age) || age < 5 || age > 120) errors.age = 'Enter a valid age.';
	if (!values.school) errors.school = 'Enter the school name.';

	return { age, errors };
}

function createRegistrationId(length = 8) {
	return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(
		''
	);
}

export const load: PageServerLoad = async ({ url }) => {
	const eventId = url.searchParams.get('event')?.trim().toUpperCase() ?? '';
	const event = eventId ? getEventById(eventId) : null;

	return {
		hasEventParam: Boolean(eventId),
		event
	};
};

export const actions = {
	default: async ({ request, url }) => {
		const formData = await request.formData();
		const eventId = url.searchParams.get('event')?.trim().toUpperCase() ?? '';
		const registrationId = createRegistrationId();
		const values: FormValues = {
			name: readValue(formData, 'name'),
			email: readValue(formData, 'email'),
			phone: readValue(formData, 'phone'),
			parentName: readValue(formData, 'parentName'),
			parentEmail: readValue(formData, 'parentEmail'),
			parentPhone: readValue(formData, 'parentPhone'),
			age: readValue(formData, 'age'),
			school: readValue(formData, 'school')
		};

		const event = eventId ? getEventById(eventId) : null;

		if (!event) {
			return fail(400, {
				success: false,
				message: 'This registration link is invalid.',
				values
			});
		}

		const { age, errors } = validate(values);

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				success: false,
				errors,
				values
			});
		}

		try {
			createRegistration({
				eventId: event.id,
				registrationId,
				checked: false,
				name: values.name,
				email: values.email,
				phone: values.phone || null,
				parentName: values.parentName,
				parentEmail: values.parentEmail,
				parentPhone: values.parentPhone,
				age,
				school: values.school
			});
		} catch (error) {
			console.error('Failed to save registration', error);

			return fail(500, {
				success: false,
				message: 'We could not save the registration. Please try again.',
				values
			});
		}

		try {
			await sendRegistrationConfirmationEmail({
				eventName: event.name,
				registrationId,
				registrationUrl: `${url.origin}/registration/${registrationId}`,
				studentName: values.name,
				studentEmail: values.email,
				parentEmail: values.parentEmail
			});
		} catch (error) {
			console.error('Failed to send registration confirmation email', error);
		}

		redirect(303, `/registration/${registrationId}`);
	}
} satisfies Actions;
