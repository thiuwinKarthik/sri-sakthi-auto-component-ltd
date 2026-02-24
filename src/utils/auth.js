// Decode a JWT payload without verifying (browser-side only)
const decodeToken = (token) => {
    try {
        const base64 = token.split('.')[1];
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
};

export const saveToken = (token) => localStorage.setItem('sakthi_jwt', token);

export const getToken = () => localStorage.getItem('sakthi_jwt');

export const removeToken = () => localStorage.removeItem('sakthi_jwt');

export const getUser = () => {
    const token = getToken();
    if (!token) return null;
    return decodeToken(token);
};

export const isAuthenticated = () => {
    const user = getUser();
    if (!user) return false;
    // Check token expiry
    const now = Math.floor(Date.now() / 1000);
    return user.exp && user.exp > now;
};

export const isAdmin = () => {
    const user = getUser();
    return user && user.role === 'admin';
};
