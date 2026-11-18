// Central place for all calls to the backend API.
// In local dev, the Vite proxy forwards "/api/..." to http://localhost:5000.
// In production there's no proxy, so VITE_API_URL must point at the deployed
// server (e.g. https://travelwise-server.onrender.com/api).

import { supabase } from "./supabaseClient";

const API = import.meta.env.VITE_API_URL || "/api";

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

export function approveTravelRequest(id, optionId, comment) {
  return request(`/travel-requests/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ option_id: optionId, comment }),
  });
}

export function rejectTravelRequest(id, comment) {
  return request(`/travel-requests/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
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

// Administrator reports
export function getReports() {
  return request("/reports");
}