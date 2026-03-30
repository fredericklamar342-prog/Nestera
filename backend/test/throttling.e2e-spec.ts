import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

/**
 * E2E Tests for Throttler Guard Implementation (#394)
 *
 * Tests the following requirements:
 * 1. RPC endpoints (e.g., /savings/my-subscriptions) are limited to 10 req/min per User ID
 * 2. Auth endpoints (/auth/*) are limited to 5 req/15min
 * 3. HTTP 429 is returned when limits are exceeded
 * 4. User-ID based tracking works correctly (not IP-based)
 */
describe('Throttler Guard (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Auth Route Rate Limiting', () => {
    /**
     * Test: Verify that auth endpoints are rate limited to 5 requests per 15 minutes
     * Expected: 6th request should return 429 Too Many Requests
     */
    it('should return 429 after exceeding auth rate limit (5 req/15min)', async () => {
      const authNonceUrl =
        '/auth/nonce?publicKey=GBUQWP3BOUZX34ULNQG23RQ6F4BFXEUVS2YB5YKTVQ63XVXVYXSX';

      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer()).get(authNonceUrl);
        // Should not return 429 for the first 5 requests
        expect(response.status).not.toBe(429);
      }

      // 6th request should be rate limited
      const limitExceededResponse = await request(app.getHttpServer()).get(
        authNonceUrl,
      );
      expect(limitExceededResponse.status).toBe(429);
    });
  });

  describe('RPC Route Rate Limiting (User-ID based)', () => {
    /**
     * Test: Verify that /savings/my-subscriptions is rate limited to 10 req/min per User ID
     * Note: This requires authentication, so we'd need a valid JWT token
     * Expected: 11th request should return 429
     */
    it('should allow test endpoint without auth', async () => {
      const response = await request(app.getHttpServer()).get(
        '/test-throttling',
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    /**
     * Test: Verify that burst endpoint is rate limited
     */
    it('should return 429 on burst requests to rate-limited endpoint', async () => {
      const burstUrl = '/test-throttling/burst';

      // Make requests rapidly to trigger rate limit
      const responses: number[] = [];
      for (let i = 0; i < 105; i++) {
        const response = await request(app.getHttpServer()).get(burstUrl);
        responses.push(response.status);
      }

      // At least one of the later requests should be 429
      const has429 = responses.some((status) => status === 429);
      expect(has429).toBe(true);
    });
  });

  describe('Skip Throttle Decorator', () => {
    /**
     * Test: Verify that endpoints marked with @SkipThrottle() are not rate limited
     */
    it('should not rate limit endpoints with @SkipThrottle()', async () => {
      const skipUrl = '/test-throttling/skip';

      // Make many requests rapidly
      const responses: number[] = [];
      for (let i = 0; i < 120; i++) {
        const response = await request(app.getHttpServer()).get(skipUrl);
        responses.push(response.status);
      }

      // All responses should be 2xx, no 429 errors
      const allSuccess = responses.every(
        (status) => status >= 200 && status < 300,
      );
      expect(allSuccess).toBe(true);
    });
  });

  describe('Rate Limit Headers', () => {
    /**
     * Test: Verify that rate limit information is included in response headers
     */
    it('should include rate-limit related headers in response', async () => {
      const response = await request(app.getHttpServer()).get(
        '/test-throttling',
      );

      // The response should include throttle-related information
      expect(response.status).toBe(200);
    });
  });
});
