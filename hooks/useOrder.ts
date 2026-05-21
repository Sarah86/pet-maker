"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderInput } from "@/lib/validations/order";

export interface Order {
  id: string;
  printful_order_id: number;
  product_name: string;
  variant_id: number;
  status: "pending" | "in_production" | "shipped" | "delivered";
  tracking_url: string | null;
  currency: string;
  retail_price: string | null;
  created_at: string;
  updated_at: string;
}

export function useOrder(userId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

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
