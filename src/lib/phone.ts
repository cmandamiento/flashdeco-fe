export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Número internacional para wa.me (Perú: 51 + 9 dígitos móviles). */
export function toWhatsAppNumber(phone: string): string | null {
  const digits = digitsOnly(phone);
  if (!digits) return null;
  if (digits.length === 9 && digits.startsWith("9")) {
    return `51${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("51")) {
    return digits;
  }
  if (digits.length >= 10) {
    return digits;
  }
  return null;
}

export function getWhatsAppUrl(phone: string): string | null {
  const number = toWhatsAppNumber(phone);
  return number ? `https://wa.me/${number}` : null;
}

export function formatPhone(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = digitsOnly(phone);
  if (!digits) return null;

  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith("51")) {
    const local = digits.slice(2);
    return `+51 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }

  return phone.trim();
}
