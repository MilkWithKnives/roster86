import { describe, it, expect, beforeEach } from 'vitest'
import { createCheckoutSession, getSubscriptionStatus } from '@/api/payments'

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
      get: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn()
        }
      }
    }))
  }
}))

describe('Payment API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('createCheckoutSession', () => {
    it('should create a checkout session successfully', async () => {
      const mockResponse = {
        data: {
          sessionId: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123'
        }
      }

      const axios = await import('axios')
      const mockAxios = axios.default.create()
      vi.mocked(mockAxios.post).mockResolvedValue(mockResponse)

      // Mock localStorage
      localStorage.setItem('token', 'test-token')

      const result = await createCheckoutSession('price_123', 'Pro Plan')
      
      expect(result).toEqual(mockResponse.data)
      expect(mockAxios.post).toHaveBeenCalledWith('/api/payments/create-checkout-session', {
        priceId: 'price_123',
        planName: 'Pro Plan'
      })
    })

    it('should handle errors gracefully', async () => {
      const axios = await import('axios')
      const mockAxios = axios.default.create()
      vi.mocked(mockAxios.post).mockRejectedValue(new Error('Network error'))

      localStorage.setItem('token', 'test-token')

      await expect(createCheckoutSession('price_123', 'Pro Plan'))
        .rejects.toThrow('Network error')
    })
  })

  describe('getSubscriptionStatus', () => {
    it('should get subscription status successfully', async () => {
      const mockResponse = {
        data: {
          hasSubscription: true,
          subscription: {
            id: 'sub_123',
            status: 'active',
            plan: 'Pro Plan',
            currentPeriodEnd: 1640995200
          }
        }
      }

      const axios = await import('axios')
      const mockAxios = axios.default.create()
      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse)

      localStorage.setItem('token', 'test-token')

      const result = await getSubscriptionStatus()
      
      expect(result).toEqual(mockResponse.data)
      expect(mockAxios.get).toHaveBeenCalledWith('/api/payments/subscription-status')
    })

    it('should handle no subscription', async () => {
      const mockResponse = {
        data: {
          hasSubscription: false,
          plan: 'free'
        }
      }

      const axios = await import('axios')
      const mockAxios = axios.default.create()
      vi.mocked(mockAxios.get).mockResolvedValue(mockResponse)

      localStorage.setItem('token', 'test-token')

      const result = await getSubscriptionStatus()
      
      expect(result.hasSubscription).toBe(false)
      expect(result.plan).toBe('free')
    })
  })
})
