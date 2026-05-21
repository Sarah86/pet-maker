"use client";

import { useEffect } from "react";
import { useOrder, type Order } from "@/hooks/useOrder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink } from "lucide-react";

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Aguardando",
  in_production: "Em produção",
  shipped: "Enviado",
  delivered: "Entregue",
};

const STATUS_VARIANT: Record<
  Order["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  in_production: "outline",
  shipped: "default",
  delivered: "default",
};

interface Props {
  initialOrders: Order[];
  userId: string;
}

export default function OrderStatus({ initialOrders, userId }: Props) {
  const { orders, setOrders } = useOrder(userId);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders, setOrders]);

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Você ainda não fez nenhum pedido.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">
                {order.product_name}
              </CardTitle>
              <Badge variant={STATUS_VARIANT[order.status]}>
                {STATUS_LABEL[order.status]}
              </Badge>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-3 space-y-1.5 text-sm text-muted-foreground">
            <p>
              Pedido Printful:{" "}
              <span className="font-mono text-foreground">#{order.printful_order_id}</span>
            </p>
            <p>
              Data:{" "}
              <span className="text-foreground">
                {new Date(order.created_at).toLocaleDateString("pt-BR")}
              </span>
            </p>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
              >
                Rastrear envio
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
