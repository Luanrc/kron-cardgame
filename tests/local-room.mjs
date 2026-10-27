export const base = process.env.KRON_TEST_BASE_URL || "http://127.0.0.1:8787/api/room";
const url = new URL(base);
if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.pathname !== "/api/room") {
 throw new Error("Integration tests may only modify a local preview room.");
}
