import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";

// Lists the online-store themes installed on the shop. The `role` field marks
// which theme is live (MAIN) vs. unpublished / development copies.
const THEMES_QUERY = `#graphql
  query StoreThemes {
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
  }`;

interface ThemeNode {
  id: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface ThemesResponse {
  data?: {
    themes?: { edges: { node: ThemeNode }[] };
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(THEMES_QUERY);
  const body = (await response.json()) as ThemesResponse;
  const themes = body.data?.themes?.edges.map((edge) => edge.node) ?? [];

  const hasPublishedTheme = themes.some((theme) => theme.role === "MAIN");

  return { themes, hasPublishedTheme };
};

interface SeoCheck {
  label: string;
  description: string;
  done: boolean;
}

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

export default function ThemeAndSeo() {
  const { themes, hasPublishedTheme } = useLoaderData<typeof loader>();

  // Static SEO readiness checklist. The "live theme" item reflects real store
  // data; the rest are starter placeholders to wire up as the SEO tooling is
  // built out.
  const seoChecks: SeoCheck[] = [
    {
      label: "A published (live) theme exists",
      description:
        "Your storefront needs an active theme before SEO settings can take effect.",
      done: hasPublishedTheme,
    },
    {
      label: "Homepage title & meta description set",
      description:
        "Set a unique title tag and meta description for the homepage in Online Store › Preferences.",
      done: false,
    },
    {
      label: "Social sharing image configured",
      description:
        "Add an Open Graph / social sharing image so shared links render with a preview.",
      done: false,
    },
    {
      label: "Sitemap submitted to search engines",
      description:
        "Submit /sitemap.xml to Google Search Console and Bing Webmaster Tools.",
      done: false,
    },
    {
      label: "Alt text added to key images",
      description:
        "Descriptive alt text improves accessibility and image search ranking.",
      done: false,
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
              {themes.map((theme) => (
                <s-table-row key={theme.id}>
                  <s-table-cell>{theme.name}</s-table-cell>
                  <s-table-cell>
                    <s-badge>
                      {theme.role === "MAIN" ? "Live" : formatRole(theme.role)}
                    </s-badge>
                  </s-table-cell>
                  <s-table-cell>{formatDate(theme.createdAt)}</s-table-cell>
                  <s-table-cell>{formatDate(theme.updatedAt)}</s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>

      <s-section heading={`SEO readiness (${completed}/${seoChecks.length})`}>
        <s-paragraph>
          A quick checklist of storefront SEO essentials. These are starter
          items — connect each one to live settings as the SEO tools are built
          out.
        </s-paragraph>
        <s-stack direction="block" gap="base">
          {seoChecks.map((check) => (
            <s-stack key={check.label} direction="block" gap="small-300">
              <s-stack direction="inline" gap="base">
                <s-badge>{check.done ? "Done" : "To do"}</s-badge>
                <s-text type="strong">{check.label}</s-text>
              </s-stack>
              <s-text tone="neutral">{check.description}</s-text>
            </s-stack>
          ))}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="About this app">
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
