import express from 'express';
import SuppliersController from '../controllers/SuppliersController.js';
import {
   verifyAccessToken,
   checkAdminOrStaff,
} from '../middlewares/verifyTokenMiddleware.js';

const router = express.Router();

router.put(
   '/:id',
   [verifyAccessToken, checkAdminOrStaff],
   SuppliersController.updateSupplier
);
router.get(
   '/',
   [verifyAccessToken, checkAdminOrStaff],
   SuppliersController.getAllSuppliers
);
router.get(
   '/:id',
   [verifyAccessToken, checkAdminOrStaff],
   SuppliersController.getSupplierById
);

router.post(
   '/',
   [verifyAccessToken, checkAdminOrStaff],
   SuppliersController.createSupplier
);

router.delete(
   '/:id',
   [verifyAccessToken, checkAdminOrStaff],
   SuppliersController.deleteSupplier
);

export default router;
