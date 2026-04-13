export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type User = {
  id: string;
  login: string;
};

export type LoginFormData = {
  login: string;
  password: string;
};

export type RegisterFormData = {
  login: string;
  password: string;
};