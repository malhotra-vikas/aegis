import { handleAuth } from '@workos-inc/authkit-nextjs';

// WorkOS redirects here after sign-in; exchange the code and land on /app.
export const GET = handleAuth({ returnPathname: '/app' });
