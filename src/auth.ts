import { env } from '$env/dynamic/private';
import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';

export const { handle } = SvelteKitAuth({
	trustHost: true,
	secret: env.AUTH_SECRET ?? 'development-auth-secret-change-me-1234567890',
	providers:
		env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
			? [
					Google({
						clientId: env.AUTH_GOOGLE_ID,
						clientSecret: env.AUTH_GOOGLE_SECRET
					})
				]
			: []
});
