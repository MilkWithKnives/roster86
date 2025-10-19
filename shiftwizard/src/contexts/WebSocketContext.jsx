import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const WebSocketContext = createContext({});

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);

    useEffect(() => {
        // Get the base URL from environment or default to localhost
        const baseURL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001';
        
        console.log('🔌 Attempting WebSocket connection to:', baseURL);

        const newSocket = io(baseURL, {
            autoConnect: true,
            timeout: 20000,
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            console.log('✅ WebSocket connected:', newSocket.id);
            setIsConnected(true);
            setConnectionError(null);
            
            // Join dashboard room for real-time metrics
            newSocket.emit('join-dashboard');
        });

        newSocket.on('disconnect', (reason) => {
            console.log('❌ WebSocket disconnected:', reason);
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('🔌 WebSocket connection error:', error);
            setConnectionError(error.message);
            setIsConnected(false);
        });

        // Handle metrics updates
        newSocket.on('metrics-update', (data) => {
            console.log('📊 Received metrics update:', data);
            // This will be handled by individual components
            window.dispatchEvent(new CustomEvent('metrics-update', { detail: data }));
        });

        // Handle coverage alerts
        newSocket.on('coverage-alert', (data) => {
            console.log('🚨 Received coverage alert:', data);
            window.dispatchEvent(new CustomEvent('coverage-alert', { detail: data }));
        });

        // Handle scheduling progress
        newSocket.on('scheduling-progress', (data) => {
            console.log('⚙️ Received scheduling progress:', data);
            window.dispatchEvent(new CustomEvent('scheduling-progress', { detail: data }));
        });

        setSocket(newSocket);

        return () => {
            console.log('🔌 Cleaning up WebSocket connection');
            newSocket.close();
        };
    }, []);

    const joinRoom = (room) => {
        if (socket && isConnected) {
            console.log(`🏠 Joining room: ${room}`);
            socket.emit(`join-${room}`);
        }
    };

    const leaveRoom = (room) => {
        if (socket && isConnected) {
            console.log(`🚪 Leaving room: ${room}`);
            socket.emit(`leave-${room}`);
        }
    };

    const emitEvent = (event, data) => {
        if (socket && isConnected) {
            socket.emit(event, data);
        }
    };

    const value = {
        socket,
        isConnected,
        connectionError,
        joinRoom,
        leaveRoom,
        emitEvent
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};