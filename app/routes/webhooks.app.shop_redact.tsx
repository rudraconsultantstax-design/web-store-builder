import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Mandatory GDPR/compliance webhook: `shop/redact`.
 *
 * Shopify sends this 48 hours after a store uninstalls the app, requesting
 * deletion of any data tied to that shop. Web Store builder keeps no shop
 * business data of its own here (business data lives in the shared Supabase
 * tenant store), but the app does persist Shopify session rows in Prisma, so we
 * clear those for the shop as a best-effort cleanup. Tenant Supabase rows are
 * retained by design (shared, org-scoped) and are out of scope for this hook.
 *
 * `authenticate.webhook` verifies the HMAC signature and rejects unauthenticated
 * requests before any of this runs.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Best-effort: remove any leftover Shopify session rows for the redacted shop.
  try {
    await db.session.deleteMany({ where: { shop } });
  } catch (error) {
    console.error(`shop/redact: failed to delete sessions for ${shop}`, error);
  }

  return new Response();
};
