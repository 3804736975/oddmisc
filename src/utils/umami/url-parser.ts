import { UmamiUrlError } from '../../errors';

export function parseShareUrl(shareUrl: string): { apiBase: string; shareId: string } {
  try {
    const url = new URL(shareUrl);
    const pathParts = url.pathname.split('/');
    const shareIndex = pathParts.indexOf('share');

    if (shareIndex === -1 || shareIndex === pathParts.length - 1) {
      throw new UmamiUrlError('未找到 share 路径');
    }

    const shareId = pathParts[shareIndex + 1];
    if (!shareId) throw new UmamiUrlError('缺少分享 ID');

    const pathBeforeShare = pathParts.slice(0, shareIndex).join('/');
    const apiBase = `${url.protocol}//${url.host}${pathBeforeShare}/api`;
    return { apiBase, shareId };
  } catch (error) {
    if (error instanceof UmamiUrlError) throw error;
    throw new UmamiUrlError(`无效的 URL 格式: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
