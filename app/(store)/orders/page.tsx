import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OrderStatus from "@/components/OrderStatus";
import { getDictionary } from "@/lib/i18n";

const {
  pages: { orders },
} = getDictionary();

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userOrders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          {orders.title}
        </h1>
        <p className="text-muted-foreground">{orders.subtitle}</p>
      </div>
      <OrderStatus initialOrders={userOrders ?? []} userId={user.id} />
    </div>
  );
}
