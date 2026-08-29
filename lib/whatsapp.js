export function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function normalizePhoneDigits(phone) {
  let digits = digitsOnly(phone);
  if (!digits) return null;
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
}

export function toWhatsAppUrl(phone, message) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function toTelUrl(phone) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return null;
  return `tel:+${digits}`;
}

export function openWhatsAppChat(phone, message) {
  const url = toWhatsAppUrl(phone, message);
  if (!url) {
    if (typeof window !== 'undefined') {
      alert('Add a customer mobile number before opening WhatsApp.');
    }
    return false;
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return true;
}
