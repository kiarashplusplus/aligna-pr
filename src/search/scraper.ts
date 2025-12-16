/**
 * Ethical web scraper with rate limiting and robots.txt compliance
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import robotsParser from 'robots-parser';
import { config } from '../config';
import { logger } from '../utils';

/** Transient error codes that should trigger retry */
const TRANSIENT_ERRORS = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND'];

interface RateLimitEntry {
  lastRequest: number;
  requestCount: number;
  hourStart: number;
  customDelay?: number;
}

export class EthicalScraper {
  private axiosInstance: AxiosInstance;
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private robotsCache: Map<string, ReturnType<typeof robotsParser>> = new Map();
  private htmlCache: Map<string, { content: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': config.userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
  }

  /**
   * Fetch a URL with rate limiting, robots.txt compliance, and retry logic
   * @param url - The URL to fetch
   * @param skipRobotsCheck - Skip robots.txt check (for API calls)
   * @param retryCount - Current retry attempt (internal use)
   */
  async fetch(url: string, skipRobotsCheck = false, retryCount = 0): Promise<string> {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Check robots.txt (unless skipped for API calls)
    if (!skipRobotsCheck) {
      const allowed = await this.checkRobotsTxt(domain, url);
      if (!allowed) {
        throw new Error(`Robots.txt disallows scraping: ${url}`);
      }
    }

    // Check cache
    const cached = this.htmlCache.get(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      logger.debug(`Cache hit for ${url}`);
      return cached.content;
    }

    // Apply rate limiting
    await this.applyRateLimit(domain);

    try {
      const response = await this.axiosInstance.get(url);
      const content = response.data;

      // Cache the response
      this.htmlCache.set(url, { content, timestamp: Date.now() });

      return content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        
        // Handle rate limiting (429)
        if (axiosError.response?.status === 429) {
          await this.handleRateLimit(domain);
          return this.fetch(url, skipRobotsCheck, retryCount);
        }
        
        // Handle transient network errors with retry
        if (this.isTransientError(axiosError) && retryCount < this.MAX_RETRIES) {
          const delay = this.calculateRetryDelay(retryCount);
          logger.warn(`Transient error fetching ${url}, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
          await this.sleep(delay);
          return this.fetch(url, skipRobotsCheck, retryCount + 1);
        }
        
        throw new Error(
          `HTTP ${axiosError.response?.status || axiosError.code || 'unknown'} error fetching ${url}: ${axiosError.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Check if an error is transient and should be retried
   */
  private isTransientError(error: AxiosError): boolean {
    // Network errors
    if (error.code && TRANSIENT_ERRORS.includes(error.code)) {
      return true;
    }
    // 5xx server errors
    if (error.response?.status && error.response.status >= 500) {
      return true;
    }
    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    // 1s, 2s, 4s with jitter
    const baseDelay = 1000 * Math.pow(2, retryCount);
    const jitter = Math.random() * 500;
    return baseDelay + jitter;
  }

  /**
   * Check if robots.txt allows scraping this URL
   */
  private async checkRobotsTxt(domain: string, url: string): Promise<boolean> {
    // Check cache
    if (this.robotsCache.has(domain)) {
      const robots = this.robotsCache.get(domain)!;
      return robots.isAllowed(url, 'AlignaPRBot') ?? true;
    }

    try {
      const robotsUrl = `https://${domain}/robots.txt`;
      const response = await this.axiosInstance.get(robotsUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 500,
      });

      if (response.status === 200) {
        const robots = robotsParser(robotsUrl, response.data);
        this.robotsCache.set(domain, robots);

        // Check for crawl-delay
        const crawlDelay = robots.getCrawlDelay('AlignaPRBot');
        if (crawlDelay && crawlDelay * 1000 > config.minDelayBetweenRequests) {
          // Respect crawl-delay from robots.txt
          const entry = this.rateLimits.get(domain);
          if (entry) {
            entry.customDelay = crawlDelay * 1000;
          }
        }

        return robots.isAllowed(url, 'AlignaPRBot') ?? true;
      }

      // If robots.txt doesn't exist or is inaccessible, assume allowed
      return true;
    } catch {
      // If we can't fetch robots.txt, assume allowed but be cautious
      return true;
    }
  }

  /**
   * Apply rate limiting for a domain
   */
  private async applyRateLimit(domain: string): Promise<void> {
    const now = Date.now();
    let entry = this.rateLimits.get(domain);

    if (!entry) {
      entry = {
        lastRequest: 0,
        requestCount: 0,
        hourStart: now,
      };
      this.rateLimits.set(domain, entry);
    }

    // Reset hourly counter if needed
    if (now - entry.hourStart > 60 * 60 * 1000) {
      entry.requestCount = 0;
      entry.hourStart = now;
    }

    // Check hourly limit
    if (entry.requestCount >= config.maxRequestsPerHour) {
      const waitTime = 60 * 60 * 1000 - (now - entry.hourStart);
      throw new Error(
        `Hourly rate limit reached for ${domain}. Try again in ${Math.ceil(waitTime / 60000)} minutes.`
      );
    }

    // Apply minimum delay between requests
    const customDelay = entry.customDelay || config.minDelayBetweenRequests;
    const timeSinceLastRequest = now - entry.lastRequest;
    if (timeSinceLastRequest < customDelay) {
      await this.sleep(customDelay - timeSinceLastRequest);
    }

    // Update tracking
    entry.lastRequest = Date.now();
    entry.requestCount++;
  }

  /**
   * Handle rate limit (429) response with exponential backoff
   */
  private async handleRateLimit(domain: string): Promise<void> {
    const entry = this.rateLimits.get(domain);
    if (entry) {
      // Exponential backoff: 5s, 10s, 20s, 40s...
      const backoffMultiplier = Math.min(entry.requestCount, 5);
      const backoffTime = 5000 * Math.pow(2, backoffMultiplier);
      logger.warn(`Rate limited by ${domain}. Waiting ${backoffTime / 1000}s before retry...`);
      await this.sleep(backoffTime);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.htmlCache.clear();
    this.robotsCache.clear();
  }

  /**
   * Get rate limit status for a domain
   */
  getRateLimitStatus(domain: string): { requestsThisHour: number; maxPerHour: number } {
    const entry = this.rateLimits.get(domain);
    return {
      requestsThisHour: entry?.requestCount || 0,
      maxPerHour: config.maxRequestsPerHour,
    };
  }
}

// Singleton instance
export const scraper = new EthicalScraper();
