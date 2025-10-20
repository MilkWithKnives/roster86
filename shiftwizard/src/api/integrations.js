import apiClient from './apiClient';

// Core services for the application
export const Core = {
    // LLM Integration - for AI-powered features
    async invokeLLM(prompt, options = {}) {
        const response = await apiClient.post('/ai/llm', {
            prompt,
            ...options
        });
        return response.data;
    },

    // Email service
    async sendEmail(emailData) {
        const response = await apiClient.post('/email/send', emailData);
        return response.data;
    },

    // File upload service
    async uploadFile(file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);

        if (options.folder) {
            formData.append('folder', options.folder);
        }

        const response = await apiClient.post('/files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Image generation service
    async generateImage(prompt, options = {}) {
        const response = await apiClient.post('/ai/generate-image', {
            prompt,
            ...options
        });
        return response.data;
    },

    // File data extraction service
    async extractDataFromUploadedFile(fileUrl, options = {}) {
        const response = await apiClient.post('/files/extract-data', {
            fileUrl,
            ...options
        });
        return response.data;
    },

    // Create signed URL for file uploads
    async createFileSignedUrl(fileName, contentType, options = {}) {
        const response = await apiClient.post('/files/signed-url', {
            fileName,
            contentType,
            ...options
        });
        return response.data;
    },

    // Upload private file
    async uploadPrivateFile(file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);

        if (options.folder) {
            formData.append('folder', options.folder);
        }

        const response = await apiClient.post('/files/upload-private', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
};

// Export individual functions for convenience
export const InvokeLLM = Core.invokeLLM;
export const SendEmail = Core.sendEmail;
export const UploadFile = Core.uploadFile;
export const GenerateImage = Core.generateImage;
export const ExtractDataFromUploadedFile = Core.extractDataFromUploadedFile;
export const CreateFileSignedUrl = Core.createFileSignedUrl;
export const UploadPrivateFile = Core.uploadPrivateFile;