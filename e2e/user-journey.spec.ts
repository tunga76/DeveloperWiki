import { expect, test, type Page, type Route } from "@playwright/test";

const workspaceId = "workspace-e2e";
const categoryId = "category-e2e";
const documentId = "document-e2e";
const timestamp = "2026-10-11T12:00:00.000Z";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockCsrf(page: Page) {
  await page.route("**/api/v1/auth/csrf", (route) =>
    json(route, { csrfToken: "e2e-csrf-token" }),
  );
}

test("landing → registration → workspace → dashboard", async ({ page }) => {
  await mockCsrf(page);
  await page.route("**/api/v1/auth/register", (route) =>
    json(route, { user: { id: "user-e2e", email: "e2e@example.test" } }, 201),
  );
  await page.route("**/api/v1/workspaces**", async (route) => {
    if (route.request().method() === "GET")
      return json(route, { workspaces: [] });
    return json(
      route,
      {
        workspace: {
          id: workspaceId,
          name: "E2E Workspace",
          slug: "e2e-workspace",
          role: "ADMIN",
        },
      },
      201,
    );
  });
  await page.route(`**/api/v1/workspaces/${workspaceId}/dashboard`, (route) =>
    json(route, {
      role: "ADMIN",
      counts: { documents: 0, categories: 0, members: 1, favorites: 0 },
      latestDocuments: [],
      recentDocuments: [],
    }),
  );

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Bilgi dağılmasın/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Ücretsiz başla/ }).click();
  await expect(
    page.getByRole("heading", { name: "Hesabınızı oluşturun" }),
  ).toBeVisible();
  await page.getByLabel("Ad soyad").fill("E2E Kullanıcı");
  await page.getByLabel("E-posta adresi").fill("e2e@example.test");
  await page.getByLabel("Parola").fill("e2e-password-long-enough");
  await page.getByRole("button", { name: "Hesap oluştur" }).click();

  await expect(page).toHaveURL(/\/workspace\/new$/);
  await expect(
    page.getByRole("heading", { name: "Workspace’inizi kurun" }),
  ).toBeVisible();
  await page.getByLabel("Workspace adı").fill("E2E Workspace");
  await page.getByLabel("Workspace adresi").fill("e2e-workspace");
  await page.getByRole("button", { name: "Workspace oluştur" }).click();
  await expect(page.getByRole("status")).toContainText("E2E Workspace");
  await page.getByRole("link", { name: /Workspace’inize geçin/ }).click();

  await expect(page).toHaveURL(
    new RegExp(`/workspaces/${workspaceId}/dashboard$`),
  );
  await expect(
    page.getByRole("heading", { name: "Workspace’iniz" }),
  ).toBeVisible();
  await expect(page.getByText("Henüz doküman yok")).toBeVisible();
});

test("login, profile update, theme preference, and logout", async ({
  page,
}) => {
  let displayName = "E2E Kullanıcı";
  await mockCsrf(page);
  await page.route("**/api/v1/auth/login", (route) =>
    json(route, { user: { id: "user-e2e", email: "e2e@example.test" } }),
  );
  await page.route("**/api/v1/auth/me", async (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as { name: string };
      displayName = body.name;
    }
    return json(route, {
      user: { id: "user-e2e", email: "e2e@example.test", name: displayName },
    });
  });
  await page.route("**/api/v1/auth/logout", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route("**/api/v1/workspaces", (route) =>
    json(route, {
      workspaces: [
        {
          id: workspaceId,
          name: "E2E Workspace",
          slug: "e2e-workspace",
          role: "ADMIN",
        },
      ],
    }),
  );

  await page.goto("/login");
  await page.getByLabel("E-posta adresi").fill("e2e@example.test");
  await page.getByLabel("Parola").fill("e2e-password-long-enough");
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/\/workspace\/new$/);

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Profil" })).toBeVisible();
  await page.getByLabel("Adınız").fill("Güncel Kullanıcı");
  await page.getByRole("button", { name: "Değişiklikleri kaydet" }).click();
  await expect(page.getByText("Profil güncellendi.")).toBeVisible();
  await page.getByRole("button", { name: "Koyu tema" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL("/");
});

test("category and document create/edit with version history", async ({
  page,
}) => {
  let categories: Array<Record<string, unknown>> = [];
  let documents: Array<Record<string, unknown>> = [];
  let isFavorite = false;
  await mockCsrf(page);
  await page.route(
    `**/api/v1/workspaces/${workspaceId}/categories**`,
    async (route) => {
      if (route.request().method() === "GET")
        return json(route, { categories });
      const body = route.request().postDataJSON() as Record<string, unknown>;
      const category = {
        ...(route.request().method() === "PATCH" ? categories[0] : {}),
        id: categoryId,
        name: body.name,
        slug: body.slug,
        description: body.description,
        color: null,
        _count: { documents: 0 },
      };
      categories = [category];
      return json(
        route,
        { category },
        route.request().method() === "POST" ? 201 : 200,
      );
    },
  );
  await page.route(
    `**/api/v1/workspaces/${workspaceId}/documents**`,
    async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      if (url.pathname.endsWith("/versions")) {
        return json(route, {
          versions: [
            {
              id: "version-e2e",
              version: 1,
              title: "İlk rehber",
              content: "İlk içerik",
              createdAt: timestamp,
              createdById: "user-e2e",
            },
          ],
        });
      }
      if (url.pathname.endsWith("/favorite")) {
        if (method === "POST") isFavorite = true;
        if (method === "DELETE") isFavorite = false;
        return json(route, { isFavorite });
      }
      if (url.pathname.endsWith("/recent"))
        return route.fulfill({ status: 204 });
      if (url.pathname.endsWith(`/${documentId}`) && method === "GET") {
        return json(route, { document: documents[0] });
      }
      if (url.pathname.endsWith(`/${documentId}`) && method === "PATCH") {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        documents = [{ ...documents[0], ...body, updatedAt: timestamp }];
        return json(route, { document: documents[0] });
      }
      if (method === "GET") {
        if (url.pathname.endsWith("/categories"))
          return json(route, { categories });
        return json(route, { documents });
      }
      const body = route.request().postDataJSON() as Record<string, unknown>;
      documents = [
        {
          id: documentId,
          title: body.title,
          slug: "ilk-rehber",
          content: "İlk içerik",
          updatedAt: timestamp,
          categoryId,
          category: {
            id: categoryId,
            name: String(categories[0]?.name ?? "Platform"),
            color: null,
          },
        },
      ];
      return json(route, { document: documents[0] }, 201);
    },
  );

  await page.goto(`/workspaces/${workspaceId}/categories`);
  await page.getByLabel("Ad", { exact: true }).fill("Platform");
  await page.getByLabel("Slug").fill("platform");
  await page.getByRole("button", { name: "Kategori oluştur" }).click();
  await expect(page.getByText("Platform", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Düzenle" }).click();
  await expect(
    page.getByRole("heading", { name: "Kategoriyi düzenle" }),
  ).toBeVisible();
  await page.getByLabel("Ad", { exact: true }).fill("Platform güncel");
  await page.getByRole("button", { name: "Değişiklikleri kaydet" }).click();
  await expect(
    page.getByText("Platform güncel", { exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: /Dokümanlara git/ }).click();
  await page.getByLabel("Başlık").fill("İlk rehber");
  await page.getByLabel("Kategori").selectOption(categoryId);
  await page.getByRole("button", { name: "Doküman oluştur" }).click();
  await expect(page.getByText("İlk rehber", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Düzenle" }).click();
  await expect(
    page.getByRole("heading", { name: "Doküman editörü" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "☆ Favoriye ekle" }).click();
  await expect(page.getByRole("button", { name: "★ Favoride" })).toBeVisible();
  await page.getByRole("textbox", { name: "Markdown" }).fill("# Güncel içerik");
  await expect(
    page.getByRole("heading", { name: "Güncel içerik" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sürüm geçmişi" }).click();
  await expect(
    page.getByRole("heading", { name: "Sürüm geçmişi" }),
  ).toBeVisible();
  await expect(page.getByText("v1 · İlk rehber")).toBeVisible();
  await page.getByRole("button", { name: "Dokümanı kaydet" }).click();
  await expect(page.getByText("İlk rehber", { exact: true })).toBeVisible();
});

test("workspace search and favorites navigation", async ({ page }) => {
  await mockCsrf(page);
  await page.route(`**/api/v1/workspaces/${workspaceId}/search**`, (route) =>
    json(route, {
      results: [
        {
          id: documentId,
          title: "Dağıtım rehberi",
          slug: "dagitim-rehberi",
          categoryId,
          categoryName: "Platform",
          categoryColor: null,
          snippet: "Güvenli dağıtım adımları",
          updatedAt: timestamp,
          rank: 1,
        },
      ],
    }),
  );
  await page.route(`**/api/v1/workspaces/${workspaceId}/favorites**`, (route) =>
    json(route, {
      favorites: [
        {
          id: documentId,
          title: "Dağıtım rehberi",
          slug: "dagitim-rehberi",
          favoritedAt: timestamp,
          category: { id: categoryId, name: "Platform", color: null },
        },
      ],
    }),
  );

  await page.goto(`/workspaces/${workspaceId}/search`);
  await page.getByRole("textbox", { name: "Arama sorgusu" }).fill("dağıtım");
  await page.getByRole("button", { name: "Ara" }).click();
  await expect(
    page.getByRole("link", { name: "Dağıtım rehberi" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Favoriler" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/workspaces/${workspaceId}/favorites$`),
  );
  await expect(page.getByRole("heading", { name: "Favoriler" })).toBeVisible();
  await expect(
    page.getByText("Dağıtım rehberi", { exact: true }),
  ).toBeVisible();
});
