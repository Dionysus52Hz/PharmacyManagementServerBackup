import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';

export const verifyAccessToken = asyncHandler(async (req, res, next) => {
   const token = req.headers.authorization;
   if (req?.headers?.authorization.startsWith('Bearer')) {
      const accessToken = token.split(' ')[1];
      jwt.verify(
         accessToken,
         process.env.JWT_ACCESS_TOKEN_SECRET,
         (err, user) => {
            if (err) {
               return res.status(401).json({
                  success: false,
                  message: 'Invalid access token',
               });
            }
            req.user = user;
            next();
         }
      );
   } else {
      return res.status(401).json({
         success: false,
         message: 'Not verify access token. Require authentication',
      });
   }
});

export const checkIsStaff = asyncHandler(async (req, res, next) => {
   const { isAdmin, role } = req.user;
   if (role !== 'staff') {
      res.status(401).json({
         success: false,
         message: 'Require admin role',
      });
   }
   next();
});

export const checkIsAdmin = asyncHandler(async (req, res, next) => {
   const { isAdmin, role } = req.user;
   if (isAdmin === false && role !== 'admin') {
      res.status(401).json({
         success: false,
         message: 'Require admin role',
      });
   }
   if (isAdmin === true || role === 'admin') next();
});

export const checkAdminOrStaff = asyncHandler(async (req, res, next) => {
   const { role } = req.user;
   console.log('req.user: ', req.user);
   if (role === 'admin' || role === 'staff') {
      next();
   } else {
      // Nếu không phải, trả về thông báo truy cập bị từ chối
      return res
         .status(403)
         .json({ message: 'Bạn không có quyền để truy cập vào.' });
   }
});

export default {
   verifyAccessToken,
   checkIsStaff,
   checkIsAdmin,
   checkAdminOrStaff,
};
