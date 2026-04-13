export interface RegisterDto {
    login: string
    password: string
}

export interface LoginDto {
    login: string
    password: string
}

export interface RefreshDto {
    refreshToken: string
}

export interface TokenDto {
    accessToken: string
    refreshToken: string
}

export interface UserProfileDto {
    id: string
    login: string
}