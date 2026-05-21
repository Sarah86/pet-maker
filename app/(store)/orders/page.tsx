import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OrderStatus from "@/components/OrderStatus";

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Meus pedidos</h1>
        <p className="text-muted-foreground">
          Acompanhe o status dos seus pedidos em tempo real.
        </p>
      </div>
      <OrderStatus initialOrders={orders ?? []} userId={user.id} />
    </div>
  );
}
