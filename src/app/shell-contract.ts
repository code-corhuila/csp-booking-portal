/**
 * What the shell guarantees to every portal. Inside the shell, a failed request
 * reaches the portal as this object ? never as a raw HttpErrorResponse ? and
 * userMessage is already decided. Keep in step with csp-front/src/app/core/http/api-error.ts.
 */
export interface FieldError {
  field: string;
  message: string;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details: FieldError[];
  traceId: string;
  userMessage: string;
}

function isFieldError(value: unknown): value is FieldError {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { field?: unknown }).field === 'string'
    && typeof (value as { message?: unknown }).message === 'string';
}

export function asApiError(err: unknown): ApiError {
  if (typeof err === 'object' && err !== null) {
    const candidate = err as Partial<ApiError>;
    if (
      typeof candidate.status === 'number'
      && typeof candidate.code === 'string'
      && typeof candidate.message === 'string'
      && Array.isArray(candidate.details)
      && candidate.details.every(isFieldError)
      && typeof candidate.traceId === 'string'
      && typeof candidate.userMessage === 'string'
    ) {
      return candidate as ApiError;
    }
  }

  return {
    status: 0,
    code: 'UNKNOWN',
    message: String(err),
    details: [],
    traceId: '',
    userMessage: 'Something went wrong.',
  };
}
