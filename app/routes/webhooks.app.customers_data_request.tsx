import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * Mandatory GDPR/compliance webhook: `customers/data_request`.
 *
 * Shopify sends this when a store customer requests their data from a merchant.
 * Apps that store customer personal data must collate and provide it to the
 * merchant. Web Store builder keeps no customer PII (it works with themes, SEO,
 * and online-store content only), so there is nothing to assemble — we just
 * acknowledge receipt with a 200 so Shopify marks the request handled.
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
