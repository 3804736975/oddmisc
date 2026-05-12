declare const PKG_VERSION: string;
export const VERSION = typeof PKG_VERSION !== 'undefined' ? PKG_VERSION : 'dev';
