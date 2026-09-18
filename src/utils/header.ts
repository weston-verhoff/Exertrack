import type { GlobalHeaderVariant } from '../components/GlobalHeader';

const secondaryHeaderPaths = [
  /^\/plan\/?$/,
  /^\/templates\/[^/]+\/edit\/?$/,
];

export const getGlobalHeaderVariant = (pathname: string): GlobalHeaderVariant =>
  secondaryHeaderPaths.some((pattern) => pattern.test(pathname))
    ? 'secondary'
    : 'default';
