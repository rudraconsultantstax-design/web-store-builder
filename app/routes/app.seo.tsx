import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";

// Pulls the live storefront signals the SEO audit scores against:
//   - shop.primaryDomain.sslEnabled: HTTPS is a baseline ranking/trust signal.
//   - shop.description: the store meta description shown in search results.
//   - shop.contactEmail: a reachable contact address (trust / NAP signal).
//   - themes(roles: [MAIN]): confirms a published live theme exists; SEO
//     settings only take effect once a MAIN theme is active.
//   - pagesCount: number of online-store content pages (About/Contact/policies
//     add crawlable, link-worthy surface area).
// Validated against the Admin API 2026-04 schema.
const SEO_AUDIT_QUERY = `#graphql
  query SeoAuditData {
    shop {
      name
      description
      contactEmail
      primaryDomain {
        host
        url
        sslEnabled
      }
    }
    themes(first: 50, roles: [MAIN]) {
      edges {
        node {
          id
          name
          role
        }
      }
    }
    pagesCount {
      count
      precision
    }
  }`;

interface ShopAuditInfo {
  name: string;
  description: string | null;
  contactEmail: string | null;
  primaryDomain: {
    host: string;
    url: string;
    sslEnabled: boolean;
  } | null;
}

interface MainThemeNode {
  id: string;
  name: string;
  role: string;
}

interface SeoAuditResponse {
  data?: {
    shop?: ShopAuditInfo | null;
    themes?: { edges: { node: MainThemeNode }[] };
    pagesCount?: { count: number; precision: string } | null;
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(SEO_AUDIT_QUERY);
  const body = (await response.json()) as SeoAuditResponse;

  const shop = body.data?.shop ?? null;
  const mainTheme = body.data?.themes?.edges?.[0]?.node ?? null;
  const pagesCount = body.data?.pagesCount?.count ?? 0;

  return { shop, mainTheme, pagesCount };
};

interface AuditCheck {
  label: string;
  passed: boolean;
  detail: string;
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

// Maps an overall score (0-100) to a headline label + badge tone.
function scoreBadge(score: number): { label: string; tone: BadgeTone } {
  if (score >= 80) {
    return { label: "Good", tone: "success" };
  }
  if (score >= 50) {
    return { label: "Needs work", tone: "caution" };
  }
  return { label: "Poor", tone: "critical" };
}

export default function SeoAudit() {
  const { shop, mainTheme, pagesCount } = useLoaderData<typeof loader>();

  const primaryDomain = shop?.primaryDomain ?? null;
  const hasDescription = Boolean(
    shop?.description && shop.description.trim().length > 0,
  );
  const hasContactEmail = Boolean(
    shop?.contactEmail && shop.contactEmail.trim().length > 0,
  );

  // Each check is a pass/fail computed entirely from live Admin API data.
  const checks: AuditCheck[] = [
    {
      label: "HTTPS / SSL enabled on the primary domain",
      passed: primaryDomain?.sslEnabled === true,
      detail: primaryDomain
        ? primaryDomain.sslEnabled
          ? `Secure (HTTPS) is active on ${primaryDomain.host}.`
          : `${primaryDomain.host} is not served over HTTPS. Enable SSL in Settings › Domains.`
        : "No primary domain is configured, so HTTPS can't be verified.",
    },
    {
      label: "Published (live) theme present",
      passed: mainTheme !== null,
      detail: mainTheme
        ? `“${mainTheme.name}” is published as the live theme.`
        : "No live (MAIN) theme is published. Publish a theme so SEO settings apply.",
    },
    {
      label: "Store meta description set",
      passed: hasDescription,
      detail: hasDescription
        ? "A store meta description is set and will appear in search results."
        : "Add a store meta description in Online Store › Preferences for richer search snippets.",
    },
    {
      label: "Public contact email configured",
      passed: hasContactEmail,
      detail: hasContactEmail
        ? `Customers can reach the store at ${shop?.contactEmail}.`
        : "Set a public contact email in Settings › Store details to strengthen trust signals.",
    },
    {
      label: "Content pages published",
      passed: pagesCount > 0,
      detail:
        pagesCount > 0
          ? `${pagesCount} online-store page${pagesCount === 1 ? "" : "s"} give search engines more to index.`
          : "No content pages found. Add pages like About or Contact to expand crawlable content.",
    },
  ];

  const passed = checks.filter((check) => check.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  const headline = scoreBadge(score);

  return (
    <s-page heading="SEO audit">
      <s-section heading="Overall score">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base">
            <s-text type="strong">{score} / 100</s-text>
            <s-badge tone={headline.tone}>{headline.label}</s-badge>
            <s-text tone="neutral">
              {passed} of {checks.length} checks passing
            </s-text>
          </s-stack>
          <s-paragraph>
            This audit runs live checks against your store&rsquo;s Shopify
            settings. Resolve any failing checks below to improve search
            visibility and storefront trust.
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="Checks">
        <s-stack direction="block" gap="base">
          {checks.map((check) => (
            <s-stack key={check.label} direction="block" gap="small-300">
              <s-stack direction="inline" gap="base">
                <s-badge tone={check.passed ? "success" : "critical"}>
                  {check.passed ? "Pass" : "Fail"}
                </s-badge>
                <s-text type="strong">{check.label}</s-text>
              </s-stack>
              <s-text tone="neutral">{check.detail}</s-text>
            </s-stack>
          ))}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="About this audit">
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
        ) : null}
        <s-paragraph>
          Checks cover storefront security, a published theme, search-result
          metadata, contact details, and content depth. More checks will be
          added as additional SEO settings become queryable.
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
