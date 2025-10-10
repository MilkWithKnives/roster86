import { apiClient } from "./apiClient";

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("authToken");
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Employee API
export const Employee = {
    async findAll() {
        const response = await apiClient.get("/employees");
        return response.data;
    },

    async list() {
        return this.findAll();
    },

    async findById(id) {
        const response = await apiClient.get(`/employees/${id}`);
        return response.data;
    },

    async create(data) {
        const response = await apiClient.post("/employees", data);
        return response.data;
    },

    async update(id, data) {
        const response = await apiClient.put(`/employees/${id}`, data);
        return response.data;
    },

    async delete(id) {
        const response = await apiClient.delete(`/employees/${id}`);
        return response.data;
    },
};

// ShiftTemplate API
export const ShiftTemplate = {
    async findAll() {
        const response = await apiClient.get("/shift-templates");
        return response.data;
    },

    async list() {
        return this.findAll();
    },

    async findById(id) {
        const response = await apiClient.get(`/shift-templates/${id}`);
        return response.data;
    },

    async create(data) {
        const response = await apiClient.post("/shift-templates", data);
        return response.data;
    },

    async update(id, data) {
        const response = await apiClient.put(`/shift-templates/${id}`, data);
        return response.data;
    },

    async delete(id) {
        const response = await apiClient.delete(`/shift-templates/${id}`);
        return response.data;
    },
};

// Schedule API
export const Schedule = {
    async findAll() {
        const response = await apiClient.get("/schedules");
        return response.data;
    },

    async list(orderBy, limit) {
        const params = new URLSearchParams();
        if (orderBy) params.append('orderBy', orderBy);
        if (limit) params.append('limit', limit);

        const response = await apiClient.get(`/schedules?${params.toString()}`);
        return response.data;
    },

    async findById(id) {
        const response = await apiClient.get(`/schedules/${id}`);
        return response.data;
    },

    async create(data) {
        const response = await apiClient.post("/schedules", data);
        return response.data;
    },

    async update(id, data) {
        const response = await apiClient.put(`/schedules/${id}`, data);
        return response.data;
    },

    async delete(id) {
        const response = await apiClient.delete(`/schedules/${id}`);
        return response.data;
    },
};

// Assignment API
export const Assignment = {
    async findAll() {
        const response = await apiClient.get("/assignments");
        return response.data;
    },

    async list(orderBy, limit) {
        const params = new URLSearchParams();
        if (orderBy) params.append('orderBy', orderBy);
        if (limit) params.append('limit', limit);

        const response = await apiClient.get(`/assignments?${params.toString()}`);
        return response.data;
    },

    async filter(filters) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, value);
            }
        });

        const response = await apiClient.get(`/assignments?${params.toString()}`);
        return response.data;
    },

    async findById(id) {
        const response = await apiClient.get(`/assignments/${id}`);
        return response.data;
    },

    async create(data) {
        const response = await apiClient.post("/assignments", data);
        return response.data;
    },

    async update(id, data) {
        const response = await apiClient.put(`/assignments/${id}`, data);
        return response.data;
    },

    async delete(id) {
        const response = await apiClient.delete(`/assignments/${id}`);
        return response.data;
    },
};

// AppSettings API
export const AppSettings = {
    async get() {
        const response = await apiClient.get("/app-settings");
        return response.data;
    },

    async list() {
        return this.get();
    },

    async update(data) {
        const response = await apiClient.put("/app-settings", data);
        return response.data;
    },
};

// Auth API
export const User = {
    async me() {
        const response = await apiClient.get("/auth/me");
        return response.data;
    },

    async login(credentials) {
        const response = await apiClient.post("/auth/login", credentials);
        const { token, user } = response.data;

        localStorage.setItem("authToken", token);
        localStorage.setItem("user", JSON.stringify(user));

        return user;
    },

    async register(userData) {
        const response = await apiClient.post("/auth/register", userData);
        const { token, user } = response.data;

        localStorage.setItem("authToken", token);
        localStorage.setItem("user", JSON.stringify(user));

        return user;
    },

    async logout() {
        try {
            await apiClient.post("/auth/logout");
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
        }
    },

    async updateProfile(data) {
        const response = await apiClient.put("/auth/profile", data);
        return response.data;
    },

    async changePassword(data) {
        const response = await apiClient.put("/auth/change-password", data);
        return response.data;
    },
};