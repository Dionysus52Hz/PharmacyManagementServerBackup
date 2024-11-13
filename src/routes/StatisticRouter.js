import express from 'express';
import StatisticController from '../controllers/StatisticController.js'; // thêm .js nếu cần
import { verifyAccessToken, checkAdminOrStaff } from '../middlewares/verifyTokenMiddleware.js';

const router = express.Router();

router.get('/day', StatisticController.statisticDay);
router.get('/quarter', [verifyAccessToken, checkAdminOrStaff], StatisticController.statisticQuarter);
router.get('/month', [verifyAccessToken, checkAdminOrStaff], StatisticController.statisticMonth);
router.get('/year', [verifyAccessToken, checkAdminOrStaff], StatisticController.statisticYear);

export default router;
