import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";

// Lists the online-store content pages (e.g. "About us", "Contact",
// "Shipping policy"). `isPublished` reflects whether the page is visible on the
// storefront; `handle` is the URL slug used by the theme's Liquid templates.
const PAGES_QUERY = `#graphql
  query OnlineStorePages {
    pages(first: 25, sortKey: UPDATED_AT, reverse: true) {
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

// Creates a new online-store page. Requires write_online_store_pages /
// write_content (both granted in shopify.app.toml). Validated against the Admin
// API 2026-04 schema; `title` is the only required input field.
const PAGE_CREATE_MUTATION = `#graphql
  mutation CreatePage($page: PageCreateInput!) {
    pageCreate(page: $page) {
      page {
        id
        title
        handle
        isPublished
        updatedAt
      }
      userErrors {
        code
        field
        message
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

interface PageCreateUserError {
  code: string | null;
  field: string[] | null;
  message: string;
}

interface PageCreateResponse {
  data?: {
    pageCreate?: {
      page: { title: string; handle: string } | null;
      userErrors: PageCreateUserError[];
    } | null;
  };
}

interface ActionResult {
  ok: boolean;
  message: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(PAGES_QUERY);
  const body = (await response.json()) as PagesResponse;
  const pages = body.data?.pages?.edges.map((edge) => edge.node) ?? [];

  return { pages };
};

export const action = async ({
  request,
}: ActionFunctionArgs): Promise<ActionResult> => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title) {
    return { ok: false, message: "A page title is required." };
  }

  const response = await admin.graphql(PAGE_CREATE_MUTATION, {
    variables: {
      page: {
        title,
        // `body` is optional; only send it when the merchant typed something so
        // we don't overwrite the default with an empty string.
        ...(body ? { body } : {}),
      },
    },
  });

  const result = (await response.json()) as PageCreateResponse;
  const payload = result.data?.pageCreate;
  const userErrors = payload?.userErrors ?? [];

  if (userErrors.length > 0) {
    return {
      ok: false,
      message: `Could not create page: ${userErrors
        .map((error) => error.message)
        .join(" ")}`,
    };
  }

  if (!payload?.page) {
    return {
      ok: false,
      message: "Could not create page. Please try again.",
    };
  }

  // Returning from the action triggers React Router to revalidate the loader,
  // so the new page appears in the list below without a manual refresh.
  return { ok: true, message: `Created “${payload.page.title}”.` };
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
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" &&
    navigation.formMethod?.toLowerCase() === "post";

  const publishedCount = pages.filter((page) => page.isPublished).length;

  return (
    <s-page heading="Content & pages">
      <s-section heading="Create a page">
        {actionData ? (
          <s-banner
            tone={actionData.ok ? "success" : "critical"}
            heading={actionData.message}
          />
        ) : null}
        <Form method="post">
          <s-stack direction="block" gap="base">
            <s-text-field
              name="title"
              label="Title"
              placeholder="About us"
              required
            ></s-text-field>
            <s-text-area
              name="body"
              label="Content"
              details="Optional. HTML is supported."
              placeholder="Tell customers about your store…"
            ></s-text-area>
            <s-button type="submit" variant="primary" loading={isSubmitting}>
              Create page
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading={`Pages (${pages.length})`}>
        {pages.length === 0 ? (
          <s-stack direction="block" gap="base">
            <s-paragraph>No content pages found for this store yet.</s-paragraph>
            <s-paragraph>
              <s-text tone="neutral">
                Create your first page above (for example an “About us” or
                “Contact” page) and it will appear here.
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
          policy pages. New pages are created as published by default and can be
          refined in Online Store &rsaquo; Pages. The full page builder &amp;
          multi-language editing tools will live here as they are built out.
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
