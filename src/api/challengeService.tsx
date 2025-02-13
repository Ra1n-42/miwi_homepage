export const challengeService = {
  async fetchChallenges() {
    const response = await fetch("https://dev.miwi.tv/api/challange/all");
    // const response = await fetch("/challanges.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
  async deleteChallenge(id: string) {
    const response = await fetch(
      `https://dev.miwi.tv/api/challange/delete/${id}`,
      {
        method: "DELETE",
        credentials: "include", // JWT Auth
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    // Mock response für Testzwecke
    // const response = {
    //   ok: true, // API-Antwort simulieren
    //   status: 200,
    //   statusText: "OK",
    //   json: async () => ({ detail: "lol" }), // Dummy JSON-Antwort
    // };

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || `Failed to delete challenge: ${response.status}`
      );
    }

    return data;
  },
};
