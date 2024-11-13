import express from 'express';
import ManufacturersController from '../controllers/ManufacturersController.js';
import {
   verifyAccessToken,
   checkAdminOrStaff,
} from '../middlewares/verifyTokenMiddleware.js';

const router = express.Router();

router.put(
   '/:id',
   [verifyAccessToken, checkAdminOrStaff],
   ManufacturersController.updateManufacturer
);
router.get(
   '/',
   [verifyAccessToken, checkAdminOrStaff],
   ManufacturersController.getAllManufacturers
);
router.get(
   '/:id',
   [verifyAccessToken, checkAdminOrStaff],
   ManufacturersController.getManufacturerById
);

router.post(
   '/',
   [verifyAccessToken, checkAdminOrStaff],
   ManufacturersController.createManufacturer
);

router.delete(
   '/:id',
   [verifyAccessToken, checkAdminOrStaff],
   ManufacturersController.deleteManufacturer
);

export default router;
