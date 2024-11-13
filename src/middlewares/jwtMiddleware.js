import jwt from 'jsonwebtoken';

export const generateAccessToken = (id, username, role) => {
    return jwt.sign({ id, username, role }, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: '2d' });
};
export const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};


