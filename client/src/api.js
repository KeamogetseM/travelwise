// Central place for all calls to the backend API.
// Thanks to the Vite proxy, "/api/..." is forwarded to http://localhost:5000

const API = "/api";

async function request(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

// Travel requests
export function getTravelRequests() {
  return request("/travel-requests");
}

export function createTravelRequest(payload) {
  return request("/travel-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function scoreTravelRequest(id) {
  return request(`/travel-requests/${id}/score`, { method: "POST" });
}