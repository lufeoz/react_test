/**
 * Safe localStorage wrapper with quota error handling.
 */

export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
      // Try to free space by removing old photo data
      const freed = freeStorage();
      if (freed) {
        try {
          localStorage.setItem(key, value);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
    return false;
  }
}

function freeStorage() {
  let freed = false;

  // Remove oldest posts' photos first (they contain base64 images)
  try {
    const posts = JSON.parse(localStorage.getItem('restPosts') || '[]');
    if (posts.length > 0) {
      const cleaned = posts.map(p => ({ ...p, photo: null }));
      localStorage.setItem('restPosts', JSON.stringify(cleaned));
      freed = true;
    }
  } catch {
    // ignore
  }

  return freed;
}

export function getStorageUsage() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    total += (localStorage.getItem(key) || '').length;
  }
  // Rough byte estimate (UTF-16)
  return { usedKB: Math.round(total * 2 / 1024), limitKB: 5120 };
}
