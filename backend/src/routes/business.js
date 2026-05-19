import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ businesses: [] });
});

router.post('/', (req, res) => {
  res.json({ id: 'todo', name: req.body.name });
});

export default router;