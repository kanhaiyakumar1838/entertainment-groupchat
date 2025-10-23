import axios from "axios";
require("dotenv").config();
const API_URL = process.env.REACT_APP_API_URL;

const API = axios.create({ baseURL: `${API_URL}/api` });

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export default API;
