/**
 * OneSignal web push. The SDK loads from OneSignal's CDN and is initialised with the public App ID.
 * The App ID is public (it is shipped to every browser), so it lives in VITE_ONESIGNAL_APP_ID, not a secret.
 * The REST API key is a secret and never goes in the frontend.
 */

const SDK_URL = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";

type OneSignalPage = { init: (options: { appId: string }) => Promise<void> };
type DeferredWindow = Window & { OneSignalDeferred?: Array<(os: OneSignalPage) => Promise<void> | void> };

/** Loads the SDK and initialises it. Does nothing when no App ID is configured. */
export function startPush(appId: string | undefined): void {
  if (!appId) return;
  const w = window as DeferredWindow;
  w.OneSignalDeferred = w.OneSignalDeferred ?? [];
  w.OneSignalDeferred.push(async (OneSignal) => {
    await OneSignal.init({ appId });
  });
  const script = document.createElement("script");
  script.src = SDK_URL;
  script.defer = true;
  document.head.appendChild(script);
}
