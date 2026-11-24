
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/+$/, '');

let inMemoryAuthToken = null;

export function setInMemoryToken(token) {
  inMemoryAuthToken = token;
}

export function getInMemoryToken() {
  return inMemoryAuthToken;
}

export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/')
    ? path
    : `/${path}`;

  return `${API_BASE}${normalizedPath}`;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});

  headers.set('X-Requested-With', 'XMLHttpRequest');

  if (
    inMemoryAuthToken &&
    !headers.has('Authorization')
  ) {
    headers.set(
      'Authorization',
      `Bearer ${inMemoryAuthToken}`
    );
  }

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType =
    response.headers.get('content-type') || '';

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;

    if (contentType.includes('application/json')) {
      const errData = await response.json().catch(() => null);
      if (errData?.error) {
        errorMessage = errData.error;
      }
    }

    throw new ApiError(errorMessage, response.status);
  }

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

export async function fetchAuthorizedBlob(path) {
  const headers = new Headers({
    'X-Requested-With': 'XMLHttpRequest',
  });

  if (inMemoryAuthToken) {
    headers.set(
      'Authorization',
      `Bearer ${inMemoryAuthToken}`
    );
  }

  const response = await fetch(apiUrl(path), {
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiError(
      `Unable to download resource (${response.status})`,
      response.status
    );
  }

  const contentType =
    response.headers.get('content-type') ||
    'application/octet-stream';

  const blob = await response.blob();

  return { blob, contentType };
}
