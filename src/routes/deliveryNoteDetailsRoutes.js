import express from 'express';
import deliveryNoteDetailsController from '../controllers/deliveryNoteDetailsController.js';

const router = express.Router();

router.get('/', deliveryNoteDetailsController.getAllDeliveryNoteDetails);
router.get('/:delivery_note_id', deliveryNoteDetailsController.getDeliveryNoteDetailById);
router.post('/', deliveryNoteDetailsController.createDeliveryNoteDetail);
router.put('/:delivery_note_id/:medicine_id', deliveryNoteDetailsController.updateDeliveryNoteDetail);
router.delete('/:delivery_note_id/:medicine_id', deliveryNoteDetailsController.deleteDeliveryNoteDetail);

export default router;
