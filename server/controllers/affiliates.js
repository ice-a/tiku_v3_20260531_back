import * as affiliateService from '../services/affiliates.js';

/**
 * GET /api/affiliates
 * 获取 AFF 列表
 */
export async function getAffiliates(req, res) {
  try {
    const result = await affiliateService.getList(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to get affiliates'
    });
  }
}

/**
 * GET /api/affiliates/:id
 * 获取 AFF 详情
 */
export async function getAffiliateById(req, res) {
  try {
    const affiliate = await affiliateService.getById(req.params.id);
    res.json({ success: true, data: { affiliate } });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to get affiliate'
    });
  }
}

/**
 * POST /api/affiliates
 * 创建 AFF（管理员）
 */
export async function createAffiliate(req, res) {
  try {
    const affiliate = await affiliateService.create(req.body);
    res.status(201).json({ success: true, data: { affiliate } });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to create affiliate'
    });
  }
}

/**
 * PUT /api/affiliates/:id
 * 更新 AFF（管理员）
 */
export async function updateAffiliate(req, res) {
  try {
    const affiliate = await affiliateService.update(req.params.id, req.body);
    res.json({ success: true, data: { affiliate } });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to update affiliate'
    });
  }
}

/**
 * DELETE /api/affiliates/:id
 * 删除 AFF（管理员）
 */
export async function deleteAffiliate(req, res) {
  try {
    const result = await affiliateService.remove(req.params.id);
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to delete affiliate'
    });
  }
}

/**
 * POST /api/affiliates/import
 * 批量导入（管理员，文件上传）
 */
export async function importAffiliates(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const result = await affiliateService.bulkImport(req.file);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to import affiliates'
    });
  }
}
