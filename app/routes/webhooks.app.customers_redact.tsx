import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * Mandatory GDPR/compliance webhook: `customers/redact`.
 *
 * Shopify sends this when a merchant (or Shopify) requests deletion of a
 * customer's personal data, typically 48 hours after the customer has been
 * redacted in the store. Apps must erase any stored PII for that customer.
 * Web Store builder keeps no customer PII, so there is nothing to delete — we
 * acknowledge with a 200.
 *
 * `authenticate.webhook` verifies the HMAC signature and rejects unauthenticated
 * requests before any of this runs.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  // Best-effort log only; no customer data is stored by this app.
  console.log(`Received ${topic} webhook for ${shop}`, {
    customer: (payload as { customer?: { id?: number } })?.customer?.id,
  });

  return new Response();
};
