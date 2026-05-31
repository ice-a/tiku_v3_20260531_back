import * as navigationService from '../services/navigations.js';

/**
 * GET /api/navigations
 * 获取导航列表
 */
export async function getNavigations(req, res) {
  try {
    const result = await navigationService.getList(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get navigations'
    });
  }
}

/**
 * GET /api/navigations/:id
 * 获取导航详情
 */
export async function getNavigationById(req, res) {
  try {
    const navigation = await navigationService.getById(req.params.id);
    res.json({ success: true, data: { navigation } });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get navigation'
    });
  }
}

/**
 * POST /api/navigations
 * 创建导航（管理员）
 */
export async function createNavigation(req, res) {
  try {
    const navigation = await navigationService.create(req.body);
    res.status(201).json({ success: true, data: { navigation } });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create navigation'
    });
  }
}

/**
 * PUT /api/navigations/:id
 * 更新导航（管理员）
 */
export async function updateNavigation(req, res) {
  try {
    const navigation = await navigationService.update(req.params.id, req.body);
    res.json({ success: true, data: { navigation } });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update navigation'
    });
  }
}

/**
 * DELETE /api/navigations/:id
 * 删除导航（管理员）
 */
export async function deleteNavigation(req, res) {
  try {
    const result = await navigationService.remove(req.params.id);
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete navigation'
    });
  }
}

/**
 * POST /api/navigations/import
 * 批量导入（管理员，文件上传）
 */
export async function importNavigations(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const result = await navigationService.bulkImport(req.file);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to import navigations'
    });
  }
}
