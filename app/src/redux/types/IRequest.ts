export type RequestHttpMethods = 'GET' | 'POST' | 'PUT' | 'DELETE';
export interface IRequest extends globalThis.RequestInit {
    method: RequestHttpMethods;
}