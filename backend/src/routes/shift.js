import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ shifts: [] });
});

export default router;