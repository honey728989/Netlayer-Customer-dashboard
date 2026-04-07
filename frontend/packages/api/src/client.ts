import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env?.VITE_API_URL ?? ''

class HttpClient {
  private instance: AxiosInstance
  private refreshPromise: Promise<string> | null = null

  constructor() {
    this.instance = axios.create({
      baseURL: `${BASE_URL}/api/v1`,
      timeout: 15_000,
      headers: { 'Content-Type': 'application/json' },
    })

    this.instance.interceptors.request.use(this.requestInterceptor)
    this.instance.interceptors.response.use(
      (response) => response,
      this.responseErrorInterceptor,
    )
  }

  private requestInterceptor = (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('nl_access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  }

  private responseErrorInterceptor = async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        if (!this.refreshPromise) {
          this.refreshPromise = this.refreshAccessToken()
        }
        const newToken = await this.refreshPromise
        this.refreshPromise = null
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return this.instance(originalRequest)
      } catch {
        this.refreshPromise = null
        localStorage.removeItem('nl_access_token')
        localStorage.removeItem('nl_refresh_token')
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = localStorage.getItem('nl_refresh_token')
    if (!refreshToken) throw new Error('No refresh token')

    const response = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken })
    const { accessToken } = response.data
    localStorage.setItem('nl_access_token', accessToken)
    return accessToken
  }

  get http() {
    return this.instance
  }
}

export const httpClient = new HttpClient()
export const http = httpClient.http
