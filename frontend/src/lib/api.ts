// Frontend API client to communicate with the Python FastAPI Backend
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

export async function fetchStoreProfile(defaultStore?: any) {
  if (!API_BASE) return defaultStore || null;
  try {
    const res = await fetch(`${API_BASE}/api/store`, { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('FastAPI backend /api/store unreachable:', err);
  }
  return defaultStore || null;
}

export async function fetchStoreProducts(category?: string): Promise<any[]> {
  if (!API_BASE) {
    console.warn('NEXT_PUBLIC_API_URL is not configured.');
    return [];
  }
  try {
    const url = category && category !== 'All'
      ? `${API_BASE}/api/products?category=${encodeURIComponent(category)}`
      : `${API_BASE}/api/products`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error('FastAPI backend /api/products error:', err);
  }
  return [];
}

export async function submitOrder(orderData: any) {
  if (!API_BASE) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured. Backend API required for placing orders.');
  }
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Order submission failed: ${res.statusText}`);
  }
  return await res.json();
}
