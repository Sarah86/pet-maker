const BASE_URL = "https://api.printful.com";

function buildHeaders(): HeadersInit {
  const token = process.env.PRINTFUL_TOKEN;
  const storeId = process.env.PRINTFUL_STORE_ID;
  if (!token) throw new Error("PRINTFUL_TOKEN is not set");
  if (!storeId) throw new Error("PRINTFUL_STORE_ID is not set");
  return {
    Authorization: `Bearer ${token}`,
    "X-PF-Store-Id": storeId,
    "Content-Type": "application/json",
  };
}

async function request<T>(
  path: string,
  init: Omit<RequestInit, "headers"> & {
    headers?: Record<string, string>;
    next?: NextFetchRequestConfig;
  } = {}
): Promise<T> {
  const { next, ...rest } = init;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: { ...buildHeaders(), ...rest.headers },
    ...(next ? { next } : {}),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Printful ${res.status}: ${JSON.stringify(body)}`);
  }

  return res.json();
}

export const printful = {
  get: <T>(path: string, revalidate?: number) =>
    request<T>(path, revalidate !== undefined ? { next: { revalidate } } : {}),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
};

export interface PrintfulProduct {
  id: number;
  title: string;
  description: string;
  type: string;
  type_name: string;
  image: string;
  variant_count: number;
}

export interface PrintfulVariant {
  id: number;
  product_id: number;
  name: string;
  size: string;
  color: string;
  color_code: string;
  image: string;
  price: string;
  in_stock: boolean;
}

export interface PrintfulFile {
  id: string;
  url: string;
  filename: string;
  mime_type: string;
  size: number;
  status: "ok" | "waiting" | "failed";
  thumbnail_url: string;
  preview_url: string;
}

export interface MockupTask {
  task_key: string;
  status: "pending" | "waiting" | "processing" | "completed" | "failed";
  mockups?: Array<{
    placement: string;
    mockup_url: string;
    extra: Array<{ title: string; option: string; url: string }>;
  }>;
}

export interface PrintfulOrder {
  id: number;
  status: string;
  shipping_service_name: string;
  recipient: {
    name: string;
    address1: string;
    city: string;
    country_code: string;
    zip: string;
    email: string;
  };
  retail_costs: {
    currency: string;
    total: string;
  };
}
