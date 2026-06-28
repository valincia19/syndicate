const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('./scripts.controller');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth.middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authenticateToken);
router.use(authorizeRoles('owner', 'developer'));

// Folders
router.get('/folders', ctrl.listFolders.bind(ctrl));
router.get('/folders/:id', ctrl.getFolder.bind(ctrl));
router.post('/folders', ctrl.createFolder.bind(ctrl));
router.patch('/folders/:id', ctrl.updateFolder.bind(ctrl));
router.delete('/folders/:id', ctrl.deleteFolder.bind(ctrl));
router.get('/folders/:id/breadcrumb', ctrl.breadcrumb.bind(ctrl));

// Bulk operations
router.post('/bulk-move', ctrl.bulkMove.bind(ctrl));
router.post('/repair-orphans', ctrl.repairOrphans.bind(ctrl));

// Scripts
router.get('/stats', ctrl.stats.bind(ctrl));
router.post('/', upload.single('file'), ctrl.deploy.bind(ctrl));
router.get('/', ctrl.list.bind(ctrl));
router.get('/:id', ctrl.getScript.bind(ctrl));
router.patch('/:id/publish', ctrl.publish.bind(ctrl));
router.patch('/:id/deprecate', ctrl.deprecate.bind(ctrl));
router.patch('/:id/move', ctrl.move.bind(ctrl));
router.patch('/:id', ctrl.update.bind(ctrl));
router.delete('/:id', ctrl.delete.bind(ctrl));
router.get('/:id/content', ctrl.getContent.bind(ctrl));
router.put('/:id/content', ctrl.updateContent.bind(ctrl));

module.exports = router;
