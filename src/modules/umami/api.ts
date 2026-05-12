import type {
  ShareData,
  StatsQueryParams,
  PageviewsSeries,
  MetricEntry,
  MetricType,
  WebsiteInfo,
  DateRange
} from './types';
import { CacheManager } from '../../utils/umami/cache';
import { fetchWithTimeout } from '../../utils/fetch';
import { UmamiNetworkError, UmamiAuthError } from '../../errors';

// cloud.umami.is / 新版自托管 Umami 的 share token 鉴权必须带上此 context 头，
// 否则 /websites/* 一律 401。
const SHARE_CONTEXT_HEADER = 'x-umami-share-context';
const SHARE_CONTEXT_VALUE = '1';

/** 5 分钟对齐粒度（ms），用于 endAt 默认值，减少不必要的缓存未命中 */
const RANGE_ALIGN_MS = 5 * 60_000;

interface StatsAPIParams extends Partial<StatsQueryParams> {
  path?: string;
  hostname?: string;
  url?: string;
}

export interface StatsAPIResponse {
  pageviews?: number | { value: number };
  visitors?: number | { value: number };
  visits?: number | { value: number };
  bounces?: number | { value: number };
  totaltime?: number | { value: number };
  comparison?: {
    pageviews?: number;
    visitors?: number;
    visits?: number;
    bounces?: number;
    totaltime?: number;
  };
  _fromCache?: boolean;
  [key: string]: unknown;
}

export interface TimeRange {
  startAt?: number;
  endAt?: number;
}

export interface PageviewsParams extends TimeRange {
  unit?: 'year' | 'month' | 'day' | 'hour' | 'minute';
  timezone?: string;
}

export interface MetricsParams extends TimeRange {
  limit?: number;
}

type Cached<T> = T & { _fromCache?: boolean };

export class UmamiAPI {
  /** 按 `baseUrl|shareId` 索引的 share data 缓存，避免单例冲突 */
  private sharePromises = new Map<string, Promise<ShareData>>();

  constructor(private readonly cacheManager: CacheManager) {}

  private shareKey(baseUrl: string, shareId: string): string {
    return `${baseUrl}|${shareId}`;
  }

  async getShareData(baseUrl: string, shareId: string): Promise<ShareData> {
    const key = this.shareKey(baseUrl, shareId);
    let promise = this.sharePromises.get(key);
    if (!promise) {
      promise = this.fetchShareData(baseUrl, shareId).catch((err) => {
        this.sharePromises.delete(key);
        throw err;
      });
      this.sharePromises.set(key, promise);
    }
    return promise;
  }

  clearShareCache(baseUrl?: string, shareId?: string): void {
    if (baseUrl && shareId) {
      this.sharePromises.delete(this.shareKey(baseUrl, shareId));
    } else {
      this.sharePromises.clear();
    }
  }

  private async fetchShareData(baseUrl: string, shareId: string): Promise<ShareData> {
    const res = await fetchWithTimeout(`${baseUrl}/share/${shareId}`);
    if (!res.ok) {
      throw new UmamiNetworkError(`获取分享信息失败: ${res.status}`, res.status);
    }
    return res.json();
  }

  private async authedFetch<T>(baseUrl: string, shareId: string, path: string): Promise<T> {
    const { token } = await this.getShareData(baseUrl, shareId);
    const res = await fetchWithTimeout(`${baseUrl}${path}`, {
      headers: {
        'x-umami-share-token': token,
        [SHARE_CONTEXT_HEADER]: SHARE_CONTEXT_VALUE
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        // 只清除当前 share 的认证缓存，不清空所有统计数据缓存
        this.sharePromises.delete(this.shareKey(baseUrl, shareId));
        throw new UmamiAuthError('认证失败，请检查 shareId', res.status);
      }
      throw new UmamiNetworkError(`请求 ${path} 失败: ${res.status}`, res.status);
    }
    return (await res.json()) as T;
  }

  private async cachedGet<T extends object>(
    baseUrl: string,
    shareId: string,
    path: string,
    cacheKey: string
  ): Promise<Cached<T>> {
    const cached = this.cacheManager.get(cacheKey) as T | null;
    if (cached) return { ...cached, _fromCache: true };
    const data = await this.authedFetch<T>(baseUrl, shareId, path);
    this.cacheManager.set(cacheKey, data);
    return data;
  }

  /**
   * 构建发送给 Umami API 的时间范围参数。
   * 当用户没有指定 endAt 时，按 RANGE_ALIGN_MS 对齐以利于缓存。
   */
  private buildRangeQuery(range: TimeRange = {}): URLSearchParams {
    const endAt = range.endAt ?? this.alignedNow();
    return new URLSearchParams({
      startAt: (range.startAt ?? 0).toString(),
      endAt: endAt.toString()
    });
  }

  /**
   * 构建缓存 key 中的时间范围部分。
   * 当用户没有指定时间范围时，使用相同的对齐值确保 key 与请求一致。
   */
  private buildRangeCacheQuery(range: TimeRange = {}): URLSearchParams {
    const qp = new URLSearchParams();
    qp.set('startAt', (range.startAt ?? 0).toString());
    qp.set('endAt', (range.endAt ?? this.alignedNow()).toString());
    return qp;
  }

  /** 将当前时间戳按 RANGE_ALIGN_MS 向下对齐 */
  private alignedNow(): number {
    return Math.floor(Date.now() / RANGE_ALIGN_MS) * RANGE_ALIGN_MS;
  }

  async getStats(baseUrl: string, shareId: string, params: StatsAPIParams): Promise<StatsAPIResponse> {
    const { websiteId } = await this.getShareData(baseUrl, shareId);
    const qp = this.buildRangeQuery(params);
    const cacheQp = this.buildRangeCacheQuery(params);
    if (params.path) { qp.set('path', params.path); cacheQp.set('path', params.path); }
    if (params.url) { qp.set('url', params.url); cacheQp.set('url', params.url); }
    if (params.hostname) { qp.set('hostname', params.hostname); cacheQp.set('hostname', params.hostname); }
    return this.cachedGet<StatsAPIResponse>(
      baseUrl,
      shareId,
      `/websites/${websiteId}/stats?${qp.toString()}`,
      `${baseUrl}|${shareId}|stats|${cacheQp.toString()}`
    );
  }

  /** 实时数据，不缓存。 */
  async getActiveVisitors(baseUrl: string, shareId: string): Promise<{ visitors: number }> {
    const { websiteId } = await this.getShareData(baseUrl, shareId);
    return this.authedFetch(baseUrl, shareId, `/websites/${websiteId}/active`);
  }

  async getWebsite(baseUrl: string, shareId: string): Promise<Cached<WebsiteInfo>> {
    const { websiteId } = await this.getShareData(baseUrl, shareId);
    return this.cachedGet<WebsiteInfo>(
      baseUrl,
      shareId,
      `/websites/${websiteId}`,
      `${baseUrl}|${shareId}|website`
    );
  }

  async getDateRange(baseUrl: string, shareId: string): Promise<Cached<DateRange>> {
    const { websiteId } = await this.getShareData(baseUrl, shareId);
    return this.cachedGet<DateRange>(
      baseUrl,
      shareId,
      `/websites/${websiteId}/daterange`,
      `${baseUrl}|${shareId}|daterange`
    );
  }

  async getPageviews(
    baseUrl: string,
    shareId: string,
    params: PageviewsParams = {}
  ): Promise<Cached<PageviewsSeries>> {
    const { websiteId } = await this.getShareData(baseUrl, shareId);
    const qp = this.buildRangeQuery(params);
    const cacheQp = this.buildRangeCacheQuery(params);
    qp.set('unit', params.unit ?? 'day');
    qp.set('timezone', params.timezone ?? 'UTC');
    cacheQp.set('unit', params.unit ?? 'day');
    cacheQp.set('timezone', params.timezone ?? 'UTC');
    return this.cachedGet<PageviewsSeries>(
      baseUrl,
      shareId,
      `/websites/${websiteId}/pageviews?${qp.toString()}`,
      `${baseUrl}|${shareId}|pageviews|${cacheQp.toString()}`
    );
  }

  async getMetrics(
    baseUrl: string,
    shareId: string,
    type: MetricType,
    params: MetricsParams = {}
  ): Promise<MetricEntry[]> {
    const { websiteId } = await this.getShareData(baseUrl, shareId);
    const qp = this.buildRangeQuery(params);
    const cacheQp = this.buildRangeCacheQuery(params);
    qp.set('type', type);
    if (typeof params.limit === 'number') qp.set('limit', params.limit.toString());
    cacheQp.set('type', type);
    if (typeof params.limit === 'number') cacheQp.set('limit', params.limit.toString());
    const cacheKey = `${baseUrl}|${shareId}|metrics|${cacheQp.toString()}`;

    // CacheManager 只能存对象，数组包一层再缓存
    const cached = this.cacheManager.get(cacheKey) as { data: MetricEntry[] } | null;
    if (cached) return cached.data;

    const data = await this.authedFetch<MetricEntry[]>(
      baseUrl,
      shareId,
      `/websites/${websiteId}/metrics?${qp.toString()}`
    );
    this.cacheManager.set(cacheKey, { data });
    return data;
  }
}
