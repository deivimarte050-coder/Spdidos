/**
 * Device detection utilities for iPhone and app installation
 */

/**
 * Detect if user is on iPhone/iPad Safari
 */
export const isIOSDevice = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && /safari/.test(ua) && !/crios/.test(ua);
};

/**
 * Detect if app is already installed (standalone mode)
 */
export const isAppInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check display-mode
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  
  // Check navigator.standalone (iOS)
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  
  return false;
};

/**
 * Check if installation prompt should be shown
 */
export const shouldShowInstallPrompt = (): boolean => {
  // Don't show if already installed
  if (isAppInstalled()) return false;
  
  // Don't show if localStorage says user dismissed it
  const dismissed = localStorage.getItem('spdidos_install_dismissed');
  if (dismissed) return false;
  
  return true;
};

/**
 * Mark installation prompt as dismissed
 */
export const dismissInstallPrompt = (): void => {
  localStorage.setItem('spdidos_install_dismissed', JSON.stringify({ dismissedAt: Date.now() }));
};
