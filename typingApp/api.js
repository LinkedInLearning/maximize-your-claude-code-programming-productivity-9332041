(() => {
  const API = "http://127.0.0.1:8000";

  async function jsonFetch(path, opts = {}) {
    const res = await fetch(API + path, {
      headers: { "content-type": "application/json" },
      ...opts,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }
    return res.json();
  }

  window.API = {
    registerUser: (name) =>
      jsonFetch("/users", { method: "POST", body: JSON.stringify({ name }) }),
    fetchNextPassage: (userId) =>
      jsonFetch(`/passages/next?user_id=${encodeURIComponent(userId)}`),
    saveResult: (payload) =>
      jsonFetch("/results", { method: "POST", body: JSON.stringify(payload) }),
    fetchMyResults: (userId, limit = 50) =>
      jsonFetch(`/users/${userId}/results?limit=${limit}`),
    fetchLeaderboard: (limit = 10) =>
      jsonFetch(`/leaderboard?limit=${limit}`),
  };
})();
