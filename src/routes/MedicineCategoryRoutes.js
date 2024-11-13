import express from 'express';
import MedicineCategoriesController from '../controllers/MedicineCategoriesController.js';
import {
   verifyAccessToken,
   checkAdminOrStaff,
} from '../middlewares/verifyTokenMiddleware.js';

const router = express.Router();

router.put(
   '/:id',
   [verifyAccessToken, checkAdminOrStaff],
   MedicineCategoriesController.updateCategory
);
router.get(
   '/',
   [verifyAccessToken, checkAdminOrStaff],
   MedicineCategoriesController.getAllCategories
);
router.get(
   '/:id',
   [verifyAccessToken, checkAdminOrStaff],
   MedicineCategoriesController.getCategoryById
);

router.post(
   '/',
   [verifyAccessToken, checkAdminOrStaff],
   MedicineCategoriesController.createCategory
);

router.delete(
   '/:id',
   [verifyAccessToken, checkAdminOrStaff],
   MedicineCategoriesController.deleteCategory
);

export default router;
