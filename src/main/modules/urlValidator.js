class URLValidator {
  static validate(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: '請輸入 URL' };
    }

    const trimmed = url.trim();

    if (trimmed.length === 0) {
      return { valid: false, error: 'URL 不能為空' };
    }

    const youtubePatterns = [
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]+/
    ];

    const isValid = youtubePatterns.some(pattern => pattern.test(trimmed));

    if (!isValid) {
      return { valid: false, error: '僅支援 YouTube 連結' };
    }

    return { valid: true };
  }
}

module.exports = { URLValidator };
