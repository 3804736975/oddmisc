/** 包版本号（构建时从 package.json 注入） */
declare const PKG_VERSION: string;
export const VERSION = typeof PKG_VERSION !== 'undefined' ? PKG_VERSION : 'dev';
