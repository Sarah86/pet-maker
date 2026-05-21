"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderInput } from "@/lib/validations/order";

export interface Order {
  id: string;
  printful_order_id: number;
  product_name: string;
  variant_id: number;
  status: "pending" | "in_production" | "shipped" | "delivered" | "cancelled";
  stripe_payment_status: "paid" | "refunded" | "partially_refunded" | "disputed";
  tracking_url: string | null;
  currency: string;
  retail_price: string | null;
  created_at: string;
  updated_at: string;
}

export function useOrder(userId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const activeOrderKey = orders
    .filter(
      (o) =>
        o.status !== "shipped" &&
        o.status !== "delivered" &&
        o.status !== "cancelled"
    )
    .map((o) => o.id)
    .join(",");

  useEffect(() => {
    if (!activeOrderKey) return;
    const ids = activeOrderKey.split(",");
    const syncAll = () =>
      ids.forEach((id) => fetch(`/api/order/${id}/sync`).catch(() => {}));
    syncAll();
    const timer = setInterval(syncAll, 30_000);
    return () => clearInterval(timer);
  }, [activeOrderKey]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    channelRef.current = supabase
      .channel(`orders:${userId}`)
      .on<Order>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === payload.new.id ? payload.new : o))
          );
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [userId]);

  async function createOrder(input: OrderInput): Promise<{ orderId: string } | null> {
    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) return null;
    return res.json();
  }

  return { orders, setOrders, createOrder };
}
