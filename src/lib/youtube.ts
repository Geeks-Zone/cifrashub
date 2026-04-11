const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function isValidYoutubeId(value: string | undefined | null): value is string {
  return !!value && YOUTUBE_ID_RE.test(value.trim());
}
