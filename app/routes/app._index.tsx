import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";

// Lists the online-store themes installed on the shop and pulls the shop's
// storefront identity so the SEO checklist below can be computed from real
// data rather than static placeholders.
//   - theme.role: MAIN marks the live theme (only one at a time); the rest are
//     unpublished / demo / development / archived / locked copies.
//   - shop.primaryDomain: the live storefront domain (host + whether SSL is on).
//   - shop.description: the store's meta description used in search results.
const STORE_OVERVIEW_QUERY = `#graphql
  query StoreThemesAndSeo {
    themes(first: 20) {
      edges {
        node {
          id
          name
          role
          createdAt
          updatedAt
        }
      }
    }
    shop {
      name
      description
      primaryDomain {
        host
        url
        sslEnabled
      }
    }
  }`;

// Mirrors the Admin API `ThemeRole` enum (2026-04).
type ThemeRole =
  | "MAIN"
  | "UNPUBLISHED"
  | "DEMO"
  | "DEVELOPMENT"
  | "ARCHIVED"
  | "LOCKED";

interface ThemeNode {
  id: string;
  name: string;
  role: ThemeRole | string;
  createdAt: string;
  updatedAt: string;
}

interface ShopSeoInfo {
  name: string;
  description: string | null;
  primaryDomain: {
    host: string;
    url: string;
    sslEnabled: boolean;
  } | null;
}

interface StoreOverviewResponse {
  data?: {
    themes?: { edges: { node: ThemeNode }[] };
    shop?: ShopSeoInfo | null;
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(STORE_OVERVIEW_QUERY);
  const body = (await response.json()) as StoreOverviewResponse;

  const themes = body.data?.themes?.edges.map((edge) => edge.node) ?? [];
  const shop = body.data?.shop ?? null;

  return { themes, shop };
};

interface SeoCheck {
  label: string;
  description: string;
  done: boolean;
}

// Badge tone allowed by the Polaris web component <s-badge>.
type BadgeTone =
  | "auto"
  | "neutral"
  | "info"
  | "success"
  | "caution"
  | "warning"
  | "critical";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRole(role: string): string {
  // GraphQL returns enum values like MAIN / UNPUBLISHED / DEMO. Present them in
  // a friendlier "Title case" form.
  const lower = role.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// Maps a theme role to a human label + badge tone. The live (MAIN) theme is
// highlighted in success green; everything else is neutral/informational.
function roleBadge(role: string): { label: string; tone: BadgeTone } {
  switch (role) {
    case "MAIN":
      return { label: "Live", tone: "success" };
    case "UNPUBLISHED":
      return { label: "Unpublished", tone: "neutral" };
    case "DEVELOPMENT":
      return { label: "Development", tone: "info" };
    case "DEMO":
      return { label: "Demo", tone: "info" };
    case "ARCHIVED":
      return { label: "Archived", tone: "neutral" };
    case "LOCKED":
      return { label: "Locked", tone: "warning" };
    default:
      return { label: formatRole(role), tone: "neutral" };
  }
}

export default function ThemeAndSeo() {
  const { themes, shop } = useLoaderData<typeof loader>();

  const mainTheme = themes.find((theme) => theme.role === "MAIN") ?? null;
  const primaryDomain = shop?.primaryDomain ?? null;

  // SEO readiness checklist. Every item is computed from live Admin API data so
  // the score reflects the store's actual configuration. Wire up further items
  // here as more SEO settings become queryable.
  const seoChecks: SeoCheck[] = [
    {
      label: "A published (live) theme exists",
      description:
        "Your storefront needs an active (MAIN) theme before SEO settings can take effect.",
      done: mainTheme !== null,
    },
    {
      label: "Primary storefront domain configured",
      description: primaryDomain
        ? `Live at ${primaryDomain.host}. Search engines index this domain.`
        : "Set a primary domain in Settings › Domains so search engines have a canonical address to index.",
      done: primaryDomain !== null,
    },
    {
      label: "HTTPS / SSL enabled on the primary domain",
      description:
        "Secure (HTTPS) storefronts are required for trust signals and rank better in search.",
      done: primaryDomain?.sslEnabled === true,
    },
    {
      label: "Store meta description set",
      description:
        "Add a store meta description in Online Store › Preferences so search results show a compelling summary.",
      done: Boolean(shop?.description && shop.description.trim().length > 0),
    },
  ];

  const completed = seoChecks.filter((check) => check.done).length;

  return (
    <s-page heading="Theme & SEO">
      <s-section heading={`Themes (${themes.length})`}>
        {themes.length === 0 ? (
          <s-stack direction="block" gap="base">
            <s-paragraph>No themes found for this store yet.</s-paragraph>
            <s-paragraph>
              <s-text tone="neutral">
                Once a theme is added in Online Store &rsaquo; Themes it will be
                listed here.
              </s-text>
            </s-paragraph>
          </s-stack>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Theme</s-table-header>
              <s-table-header>Role</s-table-header>
              <s-table-header>Created</s-table-header>
              <s-table-header>Last updated</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {themes.map((theme) => {
                const badge = roleBadge(theme.role);
                return (
                  <s-table-row key={theme.id}>
                    <s-table-cell>{theme.name}</s-table-cell>
                    <s-table-cell>
                      <s-badge tone={badge.tone}>{badge.label}</s-badge>
                    </s-table-cell>
                    <s-table-cell>{formatDate(theme.createdAt)}</s-table-cell>
                    <s-table-cell>{formatDate(theme.updatedAt)}</s-table-cell>
                  </s-table-row>
                );
              })}
            </s-table-body>
          </s-table>
        )}
      </s-section>

      <s-section heading={`SEO readiness (${completed}/${seoChecks.length})`}>
        <s-paragraph>
          A checklist of storefront SEO essentials, computed from your live store
          settings. Resolve any “To do” items to improve search visibility.
        </s-paragraph>
        <s-stack direction="block" gap="base">
          {seoChecks.map((check) => (
            <s-stack key={check.label} direction="block" gap="small-300">
              <s-stack direction="inline" gap="base">
                <s-badge tone={check.done ? "success" : "caution"}>
                  {check.done ? "Done" : "To do"}
                </s-badge>
                <s-text type="strong">{check.label}</s-text>
              </s-stack>
              <s-text tone="neutral">{check.description}</s-text>
            </s-stack>
          ))}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Storefront">
        {shop ? (
          <s-stack direction="block" gap="small-300">
            <s-text type="strong">{shop.name}</s-text>
            {primaryDomain ? (
              <s-link href={primaryDomain.url} target="_blank">
                {primaryDomain.host}
              </s-link>
            ) : (
              <s-text tone="neutral">No primary domain set</s-text>
            )}
          </s-stack>
        ) : (
          <s-paragraph>
            <s-text tone="neutral">Storefront details unavailable.</s-text>
          </s-paragraph>
        )}
        <s-paragraph>
          Web Store builder helps you customize themes, build pages, manage
          multi-language content, and improve SEO &amp; conversion for your
          storefront.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

// Shopify needs React Router to catch some thrown responses, so their headers
// are included in the response.
export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
