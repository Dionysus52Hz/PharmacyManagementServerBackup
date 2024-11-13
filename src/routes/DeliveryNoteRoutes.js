
import express from 'express';
import deliveryNoteController from '../controllers/DeliveryNoteController.js';
import verifyToken from '../middlewares/verifyTokenMiddleware.js';

const router = express.Router();

router.get('/', deliveryNoteController.getDeliveryNotes);
router.get('/:delivery_note_id', deliveryNoteController.getDeliveryNoteById);
router.post('/', deliveryNoteController.createDeliveryNote);
router.delete('/:delivery_note_id', deliveryNoteController.deleteDeliveryNote);

export default router;
