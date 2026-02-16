import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/feedly/subscriptions", () => {
    return HttpResponse.json({ feeds: [] });
  }),
  http.get("/api/feedly/articles", () => {
    return HttpResponse.json({ entries: [] });
  }),
  http.post("/api/feedly/mark-read", () => {
    return HttpResponse.json({ ok: true });
  }),
];
