import httpClient, { authAxios } from './httpClient';
import type { TokenPair, User } from '../types/auth';

export async function apiLogin(login: string, password: string): Promise<TokenPair> {
  const res = await httpClient.post<TokenPair>('/auth/login', { login, password });
  return res.data;
}

export async function apiRegister(login: string, password: string): Promise<TokenPair> {
  const res = await httpClient.post<TokenPair>('/auth/register', { login, password });
  return res.data;
}

export async function apiRefresh(refreshToken: string): Promise<TokenPair> {
  const res = await authAxios.post<TokenPair>('/auth/refresh', { refreshToken });
  return res.data;
}

export async function apiLogout(): Promise<void> {
  await authAxios.post('/auth/logout');
}

export async function apiGetMe(): Promise<User> {
  const res = await httpClient.get<User>('/auth/me');
  return res.data;
}