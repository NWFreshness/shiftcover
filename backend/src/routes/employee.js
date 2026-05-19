import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ employees: [] });
});

export default router;