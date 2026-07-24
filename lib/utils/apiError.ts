import { AxiosError } from 'axios';

export interface ApiErrorResponse {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export class ApiError extends Error {
  code?: string;
  status?: number;
  details?: unknown;

  constructor(message: string, code?: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function parseApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<any>;
    const data = axiosError.response?.data;
    const message = data?.message || data?.error || axiosError.message || 'An unexpected error occurred';
    const code = data?.code || axiosError.code;
    const status = axiosError.response?.status;
    const details = data?.details;

    return new ApiError(message, code, status, details);
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError('An unexpected error occurred');
}

export function getErrorMessage(error: unknown): string {
  return parseApiError(error).message;
}
