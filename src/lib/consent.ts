const CONSENT_KEY = "canaan-jubilee-consent";

export function grantRegistrationConsent() {
  window.sessionStorage.setItem(CONSENT_KEY, "1");
}

export function hasRegistrationConsent() {
  return window.sessionStorage.getItem(CONSENT_KEY) === "1";
}
