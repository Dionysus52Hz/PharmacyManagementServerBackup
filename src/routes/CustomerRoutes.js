import express from 'express';
import CustomersController from '../controllers/CustomersController.js';
import {
   verifyAccessToken,
   checkAdminOrStaff,
} from '../middlewares/verifyTokenMiddleware.js';

const router = express.Router();

router.put(
   '/:id',
   [verifyAccessToken, checkAdminOrStaff],
   CustomersController.updateCustomer
);
router.get(
   '/',
   [verifyAccessToken, checkAdminOrStaff],
   CustomersController.getAllCustomers
);
router.get(
   '/:id',
   [verifyAccessToken, checkAdminOrStaff],
   CustomersController.getCustomerById
);

router.post(
   '/',
   [verifyAccessToken, checkAdminOrStaff],
   CustomersController.createCustomer
);

router.delete(
   '/:id',
   [verifyAccessToken, checkAdminOrStaff],
   CustomersController.deleteCustomer
);

export default router;
