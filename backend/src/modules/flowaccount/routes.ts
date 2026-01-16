import { Router } from 'express';
import { FlowAccountOAuthController } from './FlowAccountOAuthController';

const router = Router();
const controller = new FlowAccountOAuthController();

router.get('/authorize', controller.authorize.bind(controller));
router.get('/callback', controller.callback.bind(controller));

// We'll adding revoke later if needed or in a separate step

export default router;
