/**
 * Ethical web scraper with rate limiting and robots.txt compliance
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import robotsParser from 'robots-parser';
import { config } from '../config';

interface RateLimitEntry {
  lastRequest: number;
  requestCount: number;
  hourStart: number;
}

export class EthicalScraper {
  private axiosInstance: AxiosInstance;
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private robotsCache: Map<string, ReturnType<typeof robotsParser>> = new Map();
  private htmlCache: Map<string, { content: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
   * Fetch a URL with rate limiting and robots.txt compliance
   */
  async fetch(url: string, skipRobotsCheck = false): Promise<string> {
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
        if (axiosError.response?.status === 429) {
          // Rate limited - apply exponential backoff
          await this.handleRateLimit(domain);
          return this.fetch(url, skipRobotsCheck);
        }
        throw new Error(
          `HTTP ${axiosError.response?.status || 'unknown'} error fetching ${url}: ${axiosError.message}`
        );
      }
      throw error;
    }
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
            // Store custom delay
            (entry as any).customDelay = crawlDelay * 1000;
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
    const customDelay = (entry as any).customDelay || config.minDelayBetweenRequests;
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
      console.warn(`Rate limited by ${domain}. Waiting ${backoffTime / 1000}s before retry...`);
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
