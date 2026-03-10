import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1",
  headers: {
    "Content-Type": "application/json",
    ...(import.meta.env.VITE_API_KEY ? { "x-api-key": import.meta.env.VITE_API_KEY } : {}),
  },
});
