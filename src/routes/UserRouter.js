import express from 'express';
import UserController from '../controllers/UserController.js'; // thêm .js nếu cần
import {
   verifyAccessToken,
   checkAdminOrStaff,
} from '../middlewares/verifyTokenMiddleware.js';

const router = express.Router();

router.put(
   '/updateUserFromAdmin/:id',
   [verifyAccessToken, checkAdminOrStaff],
   UserController.updateUserFromAdmin
);
router.delete(
   '/deleteUser/:id',
   [verifyAccessToken, checkAdminOrStaff],
   UserController.deleteUser
);
router.put(
   '/lockUser/:id',
   [verifyAccessToken, checkAdminOrStaff],
   UserController.lockUser
);
router.get(
   '/getDetailUser/:id',
   [verifyAccessToken, checkAdminOrStaff],
   UserController.getDetailUser
);

router.post('/register', UserController.register);
router.post('/login', UserController.login);
router.post('/logout', UserController.logout);
router.post(
   '/createUser',
   [verifyAccessToken, checkAdminOrStaff],
   UserController.createUser
);
router.get(
   '/filterUser',
   [verifyAccessToken, checkAdminOrStaff],
   UserController.filterUser
);
router.put(
   '/changePassword',
   [verifyAccessToken, checkAdminOrStaff],
   UserController.changePassword
);
router.put(
   '/updateInfoMySelf',
   [verifyAccessToken],
   UserController.updateInfoMySelf
);
router.get(
   '/getAllUsers',
   [verifyAccessToken, checkAdminOrStaff],
   UserController.getAllUsers
);

export default router;
