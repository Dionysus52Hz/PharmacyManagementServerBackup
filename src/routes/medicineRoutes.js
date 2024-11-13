// src/routes/medicineRoutes.js
import express from 'express';
import medicineController from '../controllers/medicineController.js';
import verifyToken from '../middlewares/verifyTokenMiddleware.js';

const router = express.Router();

router.get('/', medicineController.getMedicines);
router.get('/:medicine_id', medicineController.getMedicineById);
router.post('/', medicineController.createMedicine);
router.put('/:medicine_id', medicineController.updateMedicine);
router.delete('/:medicine_id', medicineController.deleteMedicine);

export default router;
