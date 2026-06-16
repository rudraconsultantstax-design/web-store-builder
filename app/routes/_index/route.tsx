import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Web Store builder</h1>
        <p className={styles.text}>
          Theme customization, page building, SEO, and multi-language tools for
          your Shopify storefront.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Theme customization</strong>. Tune your live theme and manage
            unpublished copies without leaving the admin.
          </li>
          <li>
            <strong>SEO readiness</strong>. Track titles, meta descriptions, and
            sitemaps with a guided checklist.
          </li>
          <li>
            <strong>Pages & content</strong>. Build storefront pages and manage
            multi-language content and marketing tools.
          </li>
        </ul>
      </div>
    </div>
  );
}
