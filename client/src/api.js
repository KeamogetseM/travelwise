// Central place for all calls to the backend API.
// Thanks to the Vite proxy, "/api/..." is forwarded to http://localhost:5000

import { supabase } from "./supabaseClient";

const API = "/api";

async function request(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(API + path, {
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
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

// Current user / role
export function getMe() {
  return request("/me");
}

// Supervisor approvals
export function getApprovals(status = "pending") {
  return request(`/approvals?status=${status}`);
}

export function approveTravelRequest(id, optionId) {
  return request(`/travel-requests/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ option_id: optionId }),
  });
}

export function rejectTravelRequest(id) {
  return request(`/travel-requests/${id}/reject`, { method: "POST" });
}

// Administrator policy management
export function getPolicies() {
  return request("/policies");
}

export function createPolicy(payload) {
  return request("/policies", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePolicy(id, payload) {
  return request(`/policies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deletePolicy(id) {
  return request(`/policies/${id}`, { method: "DELETE" });
}