import assert from "node:assert";

// Function under test matching consultation.js logic
function resolveServicesApiUrl(mockWindow, mockDoc) {
  try {
    if (mockWindow && mockWindow.location) {
      const params = new URLSearchParams(mockWindow.location.search);
      const override = params.get("services_api");
      if (override) return override;

      const host = (mockWindow.location.hostname || "").toLowerCase();
      const protocol = mockWindow.location.protocol;
      const isLocal = host === "localhost" ||
                    host === "127.0.0.1" ||
                    host === "[::1]" ||
                    host.endsWith(".local") ||
                    protocol === "file:";

      if (isLocal) {
        const localMeta = mockDoc.querySelector('meta[name="simpleitech-services-api-local"]');
        return (localMeta && localMeta.content) ? localMeta.content : "http://127.0.0.1:8787/search";
      }
    }
  } catch (e) {
    // fallback
  }

  const cloudMeta = mockDoc.querySelector('meta[name="simpleitech-services-api"]');
  return (cloudMeta && cloudMeta.content)
    ? cloudMeta.content
    : "https://simpleitech-services-api.sencillatech.workers.dev/search";
}

const mockDoc = {
  querySelector(sel) {
    if (sel === 'meta[name="simpleitech-services-api-local"]') {
      return { content: "http://127.0.0.1:8787/search" };
    }
    if (sel === 'meta[name="simpleitech-services-api"]') {
      return { content: "https://simpleitech-services-api.sencillatech.workers.dev/search" };
    }
    return null;
  }
};

console.log("=== Testing Services API Resolver ===");

// 1. localhost:8080 (local server)
const localRes = resolveServicesApiUrl({ location: { hostname: "localhost", protocol: "http:", search: "" } }, mockDoc);
assert.strictEqual(localRes, "http://127.0.0.1:8787/search");
console.log("  ✓ localhost resolves to local API:", localRes);

// 2. 127.0.0.1:8080 (local IP)
const ipRes = resolveServicesApiUrl({ location: { hostname: "127.0.0.1", protocol: "http:", search: "" } }, mockDoc);
assert.strictEqual(ipRes, "http://127.0.0.1:8787/search");
console.log("  ✓ 127.0.0.1 resolves to local API:", ipRes);

// 3. file:/// (direct file opening)
const fileRes = resolveServicesApiUrl({ location: { hostname: "", protocol: "file:", search: "" } }, mockDoc);
assert.strictEqual(fileRes, "http://127.0.0.1:8787/search");
console.log("  ✓ file:// resolves to local API:", fileRes);

// 4. Cloud / GitHub Pages
const ghRes = resolveServicesApiUrl({ location: { hostname: "sencillatech.github.io", protocol: "https:", search: "" } }, mockDoc);
assert.strictEqual(ghRes, "https://simpleitech-services-api.sencillatech.workers.dev/search");
console.log("  ✓ sencillatech.github.io resolves to cloud endpoint:", ghRes);

// 5. Cloud / Production Custom Domain
const prodRes = resolveServicesApiUrl({ location: { hostname: "simpleitech.com", protocol: "https:", search: "" } }, mockDoc);
assert.strictEqual(prodRes, "https://simpleitech-services-api.sencillatech.workers.dev/search");
console.log("  ✓ simpleitech.com resolves to cloud endpoint:", prodRes);

// 6. Query param override
const queryRes = resolveServicesApiUrl({ location: { hostname: "simpleitech.com", protocol: "https:", search: "?services_api=http://mycustom:9000/search" } }, mockDoc);
assert.strictEqual(queryRes, "http://mycustom:9000/search");
console.log("  ✓ URL query override works:", queryRes);

console.log("\n🎉 ALL RESOLVER TESTS PASSED SUCCESSFULLY!");
