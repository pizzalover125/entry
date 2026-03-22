import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

export type Registration = {
	eventId: string;
	registrationId: string;
	checked: boolean;
	name: string;
	email: string;
	phone: string | null;
	parentName: string;
	parentEmail: string;
	parentPhone: string;
	age: number;
	school: string;
};

export type RegistrationRecord = Registration & {
	createdAt: string;
};

export type Event = {
	id: string;
	name: string;
	organizerEmail: string | null;
	createdAt: string;
};

export type EventRecord = Event & {
	registrationCount: number;
};

type RegistrationRow = {
	event_id: string;
	registration_id: string;
	checked: number;
	name: string;
	email: string;
	phone: string | null;
	parent_name: string;
	parent_email: string;
	parent_phone: string;
	age: number;
	school: string;
	created_at: string;
};

type EventRow = {
	id: string;
	name: string;
	organizer_email: string | null;
	created_at: string;
	registration_count: number;
};

const isVercelRuntime = Boolean(process.env.VERCEL);
const defaultDatabasePath = isVercelRuntime
	? path.join('/tmp', 'hackathon.sqlite')
	: path.join(process.cwd(), 'data', 'hackathon.sqlite');
const databasePath = process.env.DATABASE_PATH ?? defaultDatabasePath;
const dataDirectory = path.dirname(databasePath);
const idAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const legacyEventId = 'GENERAL01';

fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(databasePath);

database.pragma('journal_mode = WAL');
database.exec(`
	CREATE TABLE IF NOT EXISTS events (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		organizer_email TEXT,
		created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	)
`);

database.exec(`
	CREATE TABLE IF NOT EXISTS registrations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event_id TEXT,
		registration_id TEXT NOT NULL UNIQUE,
		checked INTEGER NOT NULL DEFAULT 0,
		name TEXT NOT NULL,
		email TEXT NOT NULL,
		phone TEXT,
		parent_name TEXT NOT NULL,
		parent_email TEXT NOT NULL,
		parent_phone TEXT NOT NULL,
		age INTEGER NOT NULL,
		school TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	)
`);

const columns = database.prepare('PRAGMA table_info(registrations)').all() as Array<{
	name: string;
}>;

if (!columns.some((column) => column.name === 'registration_id')) {
	database.exec(`
		ALTER TABLE registrations
		ADD COLUMN registration_id TEXT
	`);

	database.exec(`
		UPDATE registrations
		SET registration_id = substr(hex(randomblob(4)), 1, 8)
		WHERE registration_id IS NULL
	`);

	database.exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS registrations_registration_id_idx
		ON registrations (registration_id)
	`);
}

if (!columns.some((column) => column.name === 'checked')) {
	database.exec(`
		ALTER TABLE registrations
		ADD COLUMN checked INTEGER NOT NULL DEFAULT 0
	`);
}

if (!columns.some((column) => column.name === 'event_id')) {
	database.exec(`
		ALTER TABLE registrations
		ADD COLUMN event_id TEXT
	`);
}

const eventColumns = database.prepare('PRAGMA table_info(events)').all() as Array<{
	name: string;
}>;

if (!eventColumns.some((column) => column.name === 'organizer_email')) {
	database.exec(`
		ALTER TABLE events
		ADD COLUMN organizer_email TEXT
	`);
}

const registrationsMissingEvent = database
	.prepare(
		`
		SELECT COUNT(*) AS count
		FROM registrations
		WHERE event_id IS NULL OR event_id = ''
	`
	)
	.get() as { count: number };

if (registrationsMissingEvent.count > 0) {
	database
		.prepare(
			`
		INSERT OR IGNORE INTO events (id, name)
		VALUES (?, ?)
		`
		)
		.run(legacyEventId, 'General Event');

	database.exec(`
		UPDATE registrations
		SET event_id = '${legacyEventId}'
		WHERE event_id IS NULL OR event_id = ''
	`);
}

const insertRegistration = database.prepare(`
	INSERT INTO registrations (
		event_id,
		registration_id,
		checked,
		name,
		email,
		phone,
		parent_name,
		parent_email,
		parent_phone,
		age,
		school
	) VALUES (
		@eventId,
		@registrationId,
		@checked,
		@name,
		@email,
		@phone,
		@parentName,
		@parentEmail,
		@parentPhone,
		@age,
		@school
	)
`);

const selectRegistrations = database.prepare(`
	SELECT
		event_id,
		registration_id,
		checked,
		name,
		email,
		phone,
		parent_name,
		parent_email,
		parent_phone,
		age,
		school,
		created_at
	FROM registrations
	ORDER BY created_at DESC, id DESC
`);

const selectPaginatedRegistrations = database.prepare(`
	SELECT
		event_id,
		registration_id,
		checked,
		name,
		email,
		phone,
		parent_name,
		parent_email,
		parent_phone,
		age,
		school,
		created_at
	FROM registrations
	WHERE event_id = @eventId
	ORDER BY created_at DESC, id DESC
	LIMIT @limit OFFSET @offset
`);

const countRegistrationsStatement = database.prepare(`
	SELECT COUNT(*) AS count
	FROM registrations
	WHERE event_id = ?
`);

const updateRegistrationCheckedStatement = database.prepare(`
	UPDATE registrations
	SET checked = @checked
	WHERE registration_id = @registrationId
`);

const selectRegistrationByIdStatement = database.prepare(`
	SELECT
		event_id,
		registration_id,
		checked,
		name,
		email,
		phone,
		parent_name,
		parent_email,
		parent_phone,
		age,
		school,
		created_at
	FROM registrations
	WHERE registration_id = ?
	LIMIT 1
`);

const insertEventStatement = database.prepare(`
	INSERT INTO events (
		id,
		name,
		organizer_email
	) VALUES (
		@id,
		@name,
		@organizerEmail
	)
`);

const selectEventsStatement = database.prepare(`
	SELECT
		events.id,
		events.name,
		events.organizer_email,
		events.created_at,
		COUNT(registrations.registration_id) AS registration_count
	FROM events
	LEFT JOIN registrations ON registrations.event_id = events.id
	WHERE events.organizer_email = @organizerEmail
	GROUP BY events.id
	ORDER BY events.created_at DESC
`);

const selectEventByIdStatement = database.prepare(`
	SELECT
		id,
		name,
		organizer_email,
		created_at
	FROM events
	WHERE id = ?
	LIMIT 1
`);

const selectOwnedEventByIdStatement = database.prepare(`
	SELECT
		id,
		name,
		organizer_email,
		created_at
	FROM events
	WHERE id = @eventId
		AND organizer_email = @organizerEmail
	LIMIT 1
`);

const countUnownedEventsStatement = database.prepare(`
	SELECT COUNT(*) AS count
	FROM events
	WHERE organizer_email IS NULL OR organizer_email = ''
`);

const claimUnownedEventsStatement = database.prepare(`
	UPDATE events
	SET organizer_email = @organizerEmail
	WHERE organizer_email IS NULL OR organizer_email = ''
`);

const deleteEventRegistrationsStatement = database.prepare(`
	DELETE FROM registrations
	WHERE event_id = ?
`);

const deleteEventStatement = database.prepare(`
	DELETE FROM events
	WHERE id = @eventId
		AND organizer_email = @organizerEmail
`);

const updateEventNameStatement = database.prepare(`
	UPDATE events
	SET name = @name
	WHERE id = @eventId
		AND organizer_email = @organizerEmail
`);

const selectOwnedPaginatedRegistrations = database.prepare(`
	SELECT
		registrations.event_id,
		registrations.registration_id,
		registrations.checked,
		registrations.name,
		registrations.email,
		registrations.phone,
		registrations.parent_name,
		registrations.parent_email,
		registrations.parent_phone,
		registrations.age,
		registrations.school,
		registrations.created_at
	FROM registrations
	INNER JOIN events ON events.id = registrations.event_id
	WHERE registrations.event_id = @eventId
		AND events.organizer_email = @organizerEmail
	ORDER BY registrations.created_at DESC, registrations.id DESC
	LIMIT @limit OFFSET @offset
`);

const countOwnedRegistrationsStatement = database.prepare(`
	SELECT COUNT(*) AS count
	FROM registrations
	INNER JOIN events ON events.id = registrations.event_id
	WHERE registrations.event_id = @eventId
		AND events.organizer_email = @organizerEmail
`);

const countOwnedCheckedRegistrationsStatement = database.prepare(`
	SELECT COUNT(*) AS count
	FROM registrations
	INNER JOIN events ON events.id = registrations.event_id
	WHERE registrations.event_id = @eventId
		AND registrations.checked = 1
		AND events.organizer_email = @organizerEmail
`);

const updateOwnedRegistrationCheckedStatement = database.prepare(`
	UPDATE registrations
	SET checked = @checked
	WHERE registration_id = @registrationId
		AND event_id IN (
			SELECT id
			FROM events
			WHERE organizer_email = @organizerEmail
		)
`);

const selectOwnedRegistrationByIdStatement = database.prepare(`
	SELECT
		registrations.event_id,
		registrations.registration_id,
		registrations.checked,
		registrations.name,
		registrations.email,
		registrations.phone,
		registrations.parent_name,
		registrations.parent_email,
		registrations.parent_phone,
		registrations.age,
		registrations.school,
		registrations.created_at
	FROM registrations
	INNER JOIN events ON events.id = registrations.event_id
	WHERE registrations.registration_id = @registrationId
		AND events.organizer_email = @organizerEmail
	LIMIT 1
`);

function createRandomId(length: number) {
	return Array.from(
		{ length },
		() => idAlphabet[Math.floor(Math.random() * idAlphabet.length)]
	).join('');
}

function mapEventRow(row: Pick<EventRow, 'id' | 'name' | 'organizer_email' | 'created_at'>) {
	return {
		id: row.id,
		name: row.name,
		organizerEmail: 'organizer_email' in row ? row.organizer_email : null,
		createdAt: row.created_at
	};
}

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

function mapRegistrationRows(rows: RegistrationRow[]): RegistrationRecord[] {
	return rows.map((row) => ({
		eventId: row.event_id,
		registrationId: row.registration_id,
		checked: Boolean(row.checked),
		name: row.name,
		email: row.email,
		phone: row.phone,
		parentName: row.parent_name,
		parentEmail: row.parent_email,
		parentPhone: row.parent_phone,
		age: row.age,
		school: row.school,
		createdAt: row.created_at
	}));
}

export function createRegistration(registration: Registration) {
	insertRegistration.run({
		...registration,
		checked: registration.checked ? 1 : 0
	});
}

export function listRegistrations(): RegistrationRecord[] {
	const rows = selectRegistrations.all() as RegistrationRow[];

	return mapRegistrationRows(rows);
}

export function listRegistrationsPage(
	eventId: string,
	limit: number,
	offset: number,
	organizerEmail?: string
): RegistrationRecord[] {
	const rows = organizerEmail
		? (selectOwnedPaginatedRegistrations.all({
				eventId,
				limit,
				offset,
				organizerEmail: normalizeEmail(organizerEmail)
			}) as RegistrationRow[])
		: (selectPaginatedRegistrations.all({ eventId, limit, offset }) as RegistrationRow[]);

	return mapRegistrationRows(rows);
}

export function countRegistrations(eventId: string, organizerEmail?: string) {
	const result = organizerEmail
		? (countOwnedRegistrationsStatement.get({
				eventId,
				organizerEmail: normalizeEmail(organizerEmail)
			}) as { count: number })
		: (countRegistrationsStatement.get(eventId) as { count: number });

	return result.count;
}

export function getCheckInStats(eventId: string, organizerEmail: string) {
	const normalizedEmail = normalizeEmail(organizerEmail);
	const total = countOwnedRegistrationsStatement.get({
		eventId,
		organizerEmail: normalizedEmail
	}) as { count: number };
	const checkedIn = countOwnedCheckedRegistrationsStatement.get({
		eventId,
		organizerEmail: normalizedEmail
	}) as { count: number };

	return {
		checkedIn: checkedIn.count,
		notCheckedIn: Math.max(total.count - checkedIn.count, 0),
		total: total.count
	};
}

export function setRegistrationChecked(
	registrationId: string,
	checked: boolean,
	organizerEmail?: string
) {
	if (organizerEmail) {
		updateOwnedRegistrationCheckedStatement.run({
			registrationId,
			checked: checked ? 1 : 0,
			organizerEmail: normalizeEmail(organizerEmail)
		});

		return;
	}

	updateRegistrationCheckedStatement.run({
		registrationId,
		checked: checked ? 1 : 0
	});
}

export function getRegistrationById(
	registrationId: string,
	organizerEmail?: string
): RegistrationRecord | null {
	const row = organizerEmail
		? (selectOwnedRegistrationByIdStatement.get({
				registrationId,
				organizerEmail: normalizeEmail(organizerEmail)
			}) as RegistrationRow | undefined)
		: (selectRegistrationByIdStatement.get(registrationId) as RegistrationRow | undefined);

	if (!row) {
		return null;
	}

	return mapRegistrationRows([row])[0];
}

export function createEvent(name: string, organizerEmail: string): Event {
	for (let attempt = 0; attempt < 10; attempt += 1) {
		const event = {
			id: createRandomId(8),
			name: name.trim(),
			organizerEmail: normalizeEmail(organizerEmail)
		};

		try {
			insertEventStatement.run(event);
			const created = selectEventByIdStatement.get(event.id) as
				| Pick<EventRow, 'id' | 'name' | 'organizer_email' | 'created_at'>
				| undefined;

			if (!created) {
				throw new Error('Event was created but could not be reloaded.');
			}

			return mapEventRow(created);
		} catch (error) {
			const message = error instanceof Error ? error.message : '';

			if (!message.includes('UNIQUE constraint failed')) {
				throw error;
			}
		}
	}

	throw new Error('Could not generate a unique event ID.');
}

export function listEvents(organizerEmail: string): EventRecord[] {
	const rows = selectEventsStatement.all({
		organizerEmail: normalizeEmail(organizerEmail)
	}) as EventRow[];

	return rows.map((row) => ({
		...mapEventRow(row),
		registrationCount: row.registration_count
	}));
}

export function countUnownedEvents() {
	const result = countUnownedEventsStatement.get() as { count: number };

	return result.count;
}

export function claimUnownedEvents(organizerEmail: string) {
	const result = claimUnownedEventsStatement.run({
		organizerEmail: normalizeEmail(organizerEmail)
	});

	return result.changes;
}

export function getEventById(eventId: string, organizerEmail?: string): Event | null {
	const row = organizerEmail
		? (selectOwnedEventByIdStatement.get({
				eventId,
				organizerEmail: normalizeEmail(organizerEmail)
			}) as Pick<EventRow, 'id' | 'name' | 'organizer_email' | 'created_at'> | undefined)
		: (selectEventByIdStatement.get(eventId) as
				| Pick<EventRow, 'id' | 'name' | 'organizer_email' | 'created_at'>
				| undefined);

	if (!row) {
		return null;
	}

	return mapEventRow(row);
}

export function deleteEvent(eventId: string, organizerEmail: string) {
	const normalizedEmail = normalizeEmail(organizerEmail);

	const transaction = database.transaction((id: string) => {
		const ownedEvent = selectOwnedEventByIdStatement.get({
			eventId: id,
			organizerEmail: normalizedEmail
		}) as EventRow | undefined;

		if (!ownedEvent) {
			return;
		}

		deleteEventRegistrationsStatement.run(id);
		deleteEventStatement.run({
			eventId: id,
			organizerEmail: normalizedEmail
		});
	});

	transaction(eventId);
}

export function updateEventName(eventId: string, name: string, organizerEmail: string) {
	const result = updateEventNameStatement.run({
		eventId,
		name: name.trim(),
		organizerEmail: normalizeEmail(organizerEmail)
	});

	return result.changes > 0;
}
