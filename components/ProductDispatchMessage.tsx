"use client";

import { useEffect, useState } from "react";
import {
  getLondonDispatchMessage,
  isSpecialDispatchProduct,
  NORMAL_DELIVERY_ESTIMATE,
  type ProductDispatchCriteria,
} from "@/lib/product-dispatch";

function Message({ children }: { children: string }) {
  return (
    <p
      aria-live="polite"
      aria-atomic="true"
      className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-foreground"
    >
      {children}
    </p>
  );
}

function NormalProductDispatchMessage() {
  // Keep server and initial client markup stable; client time replaces only
  // this safe static estimate after hydration when the cutoff is still open.
  const [message, setMessage] = useState(NORMAL_DELIVERY_ESTIMATE);

  useEffect(() => {
    const updateMessage = () => {
      const nextMessage = getLondonDispatchMessage();
      setMessage((currentMessage) => currentMessage === nextMessage ? currentMessage : nextMessage);
    };

    const initialUpdateId = window.setTimeout(updateMessage, 0);
    const intervalId = window.setInterval(updateMessage, 60_000);
    return () => {
      window.clearTimeout(initialUpdateId);
      window.clearInterval(intervalId);
    };
  }, []);

  return <Message>{message}</Message>;
}

export default function ProductDispatchMessage(criteria: ProductDispatchCriteria) {
  if (isSpecialDispatchProduct(criteria)) {
    return <Message>Delivery estimate: 3–5 business days</Message>;
  }

  return <NormalProductDispatchMessage />;
}
