import express from 'express';
import receivedNoteDetailsController from '../controllers/ReceivedNoteDetailsController.js';

const router = express.Router();

router.get('/', receivedNoteDetailsController.getAllReceivedNoteDetails);
router.get(
   '/:received_note_id',
   receivedNoteDetailsController.getReceivedNoteDetailById
);
router.post('/', receivedNoteDetailsController.createReceivedNoteDetail);
router.put(
   '/:received_note_id/:medicine_id',
   receivedNoteDetailsController.updateReceivedNoteDetail
);
router.delete(
   '/:received_note_id/:medicine_id',
   receivedNoteDetailsController.deleteReceivedNoteDetail
);

export default router;
