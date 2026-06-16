import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";

// Lists the online-store content pages (e.g. "About us", "Contact",
// "Shipping policy"). `isPublished` reflects whether the page is visible on the
// storefront; `handle` is the URL slug used by the theme's Liquid templates.
const PAGES_QUERY = `#graphql
  query OnlineStorePages {
    pages(first: 25) {
      edges {
        node {
          id
          title
          handle
          isPublished
          updatedAt
        }
      }
    }
  }`;

interface PageNode {
  id: string;
  title: string;
  handle: string;
  isPublished: boolean;
  updatedAt: string;
}

interface PagesResponse {
  data?: {
    pages?: { edges: { node: PageNode }[] };
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(PAGES_QUERY);
  const body = (await response.json()) as PagesResponse;
  const pages = body.data?.pages?.edges.map((edge) => edge.node) ?? [];

  return { pages };
};

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

export default function ContentAndPages() {
  const { pages } = useLoaderData<typeof loader>();

  const publishedCount = pages.filter((page) => page.isPublished).length;

  return (
    <s-page heading="Content & pages">
      <s-section heading={`Pages (${pages.length})`}>
        {pages.length === 0 ? (
          <s-stack direction="block" gap="base">
            <s-paragraph>No content pages found for this store yet.</s-paragraph>
            <s-paragraph>
              <s-text tone="neutral">
                Create pages in Online Store &rsaquo; Pages (for example an
                “About us” or “Contact” page) and they will appear here.
              </s-text>
            </s-paragraph>
          </s-stack>
        ) : (
          <s-stack direction="block" gap="base">
            <s-text tone="neutral">
              {publishedCount} of {pages.length} published.
            </s-text>
            <s-table>
              <s-table-header-row>
                <s-table-header>Title</s-table-header>
                <s-table-header>Handle</s-table-header>
                <s-table-header>Status</s-table-header>
                <s-table-header>Last updated</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {pages.map((page) => (
                  <s-table-row key={page.id}>
                    <s-table-cell>{page.title}</s-table-cell>
                    <s-table-cell>
                      <code>/{page.handle}</code>
                    </s-table-cell>
                    <s-table-cell>
                      <s-badge tone={page.isPublished ? "success" : "neutral"}>
                        {page.isPublished ? "Published" : "Hidden"}
                      </s-badge>
                    </s-table-cell>
                    <s-table-cell>{formatDate(page.updatedAt)}</s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
          </s-stack>
        )}
      </s-section>

      <s-section slot="aside" heading="About pages">
        <s-paragraph>
          Content pages hold standalone copy such as About, Contact, FAQ, and
          policy pages. The full page builder &amp; multi-language editing tools
          will live here as they are built out.
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            <s-link
              href="https://shopify.dev/docs/apps/online-store"
              target="_blank"
            >
              Online store &amp; theme app extensions
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

// Shopify needs React Router to catch some thrown responses, so their headers
// are included in the response.
export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
