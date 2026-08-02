export function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export function toWhatsAppUrl(phone) {
  let digits = digitsOnly(phone);
  if (!digits) return null;
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}`;
}

export function openWhatsAppChat(phone) {
  const url = toWhatsAppUrl(phone);
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
