import { createMockBackend } from './mock/mock-backend';
import type { FarmSenseApi } from './types';

/**
 * The single place where the platform implementation is chosen. In Phase 2,
 * add an HTTP client implementing `FarmSenseApi` against the REST API and
 * select it here (e.g. when `import.meta.env.VITE_API_BASE_URL` is set).
 */
export const api: FarmSenseApi = createMockBackend();

export { can } from './access';
export { loadFarmSnapshot } from './load-snapshot';
export type { FarmSenseApi } from './types';
export { ApiError } from './types';
