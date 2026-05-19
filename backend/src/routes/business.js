import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req, res) => {
  try {
    const businesses = await prisma.business.findMany();
    res.json({ businesses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, industryType } = req.body;
    if (!name || !industryType) {
      return res.status(400).json({ error: 'name and industryType required' });
    }
    const business = await prisma.business.create({
      data: { name, industryType },
    });
    res.status(201).json({ business });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const business = await prisma.business.findUnique({ 
      where: { id: req.params.id } 
    });
    if (!business) return res.status(404).json({ error: 'Not found' });
    res.json({ business });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, industryType } = req.body;
    if (!name && !industryType) {
      return res.status(400).json({ error: 'At least one field (name or industryType) is required' });
    }
    const updateData = {};
    if (name) updateData.name = name;
    if (industryType) updateData.industryType = industryType;
    const business = await prisma.business.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json({ business });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.business.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;