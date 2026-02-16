import { expect, test } from "@playwright/test";

test("loads feeds and opens selected article with embed fallback", async ({ page }) => {
  await page.route("**/api/feedly/subscriptions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        feeds: [
          {
            id: "feed/1",
            title: "Feed One",
            groups: ["Tech"],
            unreadCount: 2,
          },
        ],
      }),
    });
  });

  await page.route("**/api/feedly/articles**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        entries: [
          {
            id: "entry-1",
            feedId: "feed/1",
            title: "First unread item",
            summary: "Summary text",
            source: "Feed One",
            published: Date.now(),
            ageTimestamp: Date.now(),
            url: "https://example.com/article",
          },
        ],
      }),
    });
  });

  await page.route("**/api/feedly/embed-check**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        embeddable: false,
        reason: "Blocked for test",
      }),
    });
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "BTJ RSS Reader" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Feed One" })).toBeVisible();

  await page.getByRole("button", { name: "First unread item" }).click();

  await expect(page.getByText("Blocked for test")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Original Article" })).toBeVisible();
  await expect(page.getByText("Summary")).toBeVisible();
});
