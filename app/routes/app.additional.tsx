export default function ContentAndPagesPage() {
  return (
    <s-page heading="Page builder">
      <s-section heading="Page builder & content tools">
        <s-paragraph>
          This is where the page builder, content editing, and multi-language
          tools will live. Use the Shopify{" "}
          <s-link
            href="https://shopify.dev/docs/apps/tools/app-bridge"
            target="_blank"
          >
            App Bridge
          </s-link>{" "}
          navigation to move between sections of Web Store builder.
        </s-paragraph>
        <s-paragraph>
          To add another section, create a route inside <code>app/routes</code>{" "}
          and add a link to it in the <code>&lt;s-app-nav&gt;</code> component in{" "}
          <code>app/routes/app.tsx</code>.
        </s-paragraph>
      </s-section>
      <s-section slot="aside" heading="Resources">
        <s-unordered-list>
          <s-list-item>
            <s-link
              href="https://shopify.dev/docs/apps/online-store"
              target="_blank"
            >
              Online store &amp; theme app extensions
            </s-link>
          </s-list-item>
          <s-list-item>
            <s-link
              href="https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav"
              target="_blank"
            >
              App nav best practices
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
