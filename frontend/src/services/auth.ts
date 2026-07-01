import { api } from "@/lib/api"
import type { LoginInput, RegisterInput } from "@/lib/validation/auth-schemas"

export interface UserResponse {
  id: string
  name: string
  username: string
  email: string
  role: string
  avatar?: string | null
  discord_id?: string | null
  verified?: boolean | number | null
  balance?: number | string | null
  in_discord_guild?: boolean
}

export interface LoginResponse {
  status: string
  statusCode: number
  message: string
  data: {
    user: UserResponse
    token: string
  }
}

export interface RegisterResponse {
  status: string
  statusCode: number
  message: string
  data: {
    user: UserResponse
    token: string
  }
}

export interface ProfileResponse {
  status: string
  statusCode: number
  message: string
  data: {
    user: UserResponse
  }
}

export const authService = {
  /**
   * Log in user
   */
  async login(credentials: LoginInput): Promise<LoginResponse> {
    return api.post<LoginResponse>("/v1/auth/login", {
      email: credentials.email.toLowerCase(),
      password: credentials.password,
    })
  },

  /**
   * Register new user
   * Maps Zod input to Backend API model structure
   */
  async register(input: RegisterInput): Promise<RegisterResponse> {
    return api.post<RegisterResponse>("/v1/auth/register", {
      name: input.username,
      username: input.username.toLowerCase(),
      email: input.email.toLowerCase(),
      password: input.password,
    })
  },

  /**
   * Fetch authenticated user profile
   */
  async getProfile(): Promise<ProfileResponse> {
    return api.get<ProfileResponse>("/v1/auth/profile")
  },

  /**
   * Log out - clears backend httpOnly cookie
   */
  async logout(): Promise<{ status: string; message: string }> {
    return api.post<{ status: string; message: string }>("/v1/auth/logout", {})
  },

  /**
   * Request email verification code (simulated delivery)
   */
  async sendVerification(): Promise<{ status: string; message: string }> {
    return api.post<{ status: string; message: string }>("/v1/auth/send-verification", {})
  },

  /**
   * Verify email verification code
   */
  async verifyEmail(code: string): Promise<{ status: string; message: string }> {
    return api.post<{ status: string; message: string }>("/v1/auth/verify-email", { code })
  },

  /**
   * Request password reset link
   */
  async forgotPassword(email: string): Promise<{ status: string; message: string }> {
    return api.post<{ status: string; message: string }>("/v1/auth/forgot-password", { email })
  },

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ status: string; message: string }> {
    return api.post<{ status: string; message: string }>("/v1/auth/reset-password", { token, newPassword })
  },

  /**
   * Validate password reset token
   */
  async validateResetToken(token: string): Promise<{ status: string; message: string }> {
    return api.get<{ status: string; message: string }>(`/v1/auth/reset-password/validate?token=${token}`)
  },
}
