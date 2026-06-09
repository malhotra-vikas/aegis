import { authkitMiddleware } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';

// Next 16 renamed `middleware` -> `proxy` (nodejs runtime). AuthKit gates /app
// only. It activates solely when WorkOS is configured, so /demo — and any run
// without WorkOS env — is never touched by it.
const proxyFn = process.env.WORKOS_API_KEY
  ? authkitMiddleware({ middlewareAuth: { enabled: true, unauthenticatedPaths: [] } })
  : () => NextResponse.next();

export default proxyFn;

export const config = { matcher: ['/app/:path*'] };
