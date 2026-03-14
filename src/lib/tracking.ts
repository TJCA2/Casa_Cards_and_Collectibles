/**
 * Detect shipping carrier from tracking number format and return the
 * carrier tracking URL. Falls back to a Google search link if unknown.
 */
export function getTrackingUrl(trackingNumber: string): string {
  const t = trackingNumber.trim();

  // UPS: starts with "1Z" followed by alphanumeric characters
  if (/^1Z[A-Z0-9]{16}$/i.test(t)) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(t)}`;
  }

  // FedEx: 12 or 15 or 20 digit numeric strings
  if (/^\d{12}$/.test(t) || /^\d{15}$/.test(t) || /^\d{20}$/.test(t)) {
    return `https://www.fedex.com/fedextrack/?tracknumbers=${encodeURIComponent(t)}`;
  }

  // USPS: 20–22 digit numeric strings (Intelligent Mail, Priority Mail, etc.)
  if (/^\d{20,22}$/.test(t)) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(t)}`;
  }

  // Fallback: Google search
  return `https://www.google.com/search?q=${encodeURIComponent(`track package ${t}`)}`;
}
