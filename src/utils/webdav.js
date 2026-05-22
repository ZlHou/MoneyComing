/**
 * WebDAV 云同步工具
 *
 * 支持坚果云、NextCloud、Alist 等标准 WebDAV 服务
 * 数据以 JSON 文件形式存储在远端
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';

const REMOTE_FILENAME = 'asset-manager-data.json';

function isNativePlatform() {
  try {
    return Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/**
 * 构建完整的远端文件 URL
 */
function buildUrl(config) {
  let base = config.url.replace(/\/+$/, '');
  // 如果路径不以 / 结尾则加上
  return `${base}/${REMOTE_FILENAME}`;
}

/**
 * 构建 Basic Auth header
 */
function authHeader(config) {
  const encoded = btoa(`${config.username}:${config.password}`);
  return `Basic ${encoded}`;
}

function isSuccessStatus(status) {
  return status >= 200 && status < 300;
}

async function requestWebDav(url, options = {}) {
  const headers = options.headers || {};

  if (isNativePlatform()) {
    const response = await CapacitorHttp.request({
      url,
      method: options.method || 'GET',
      headers,
      data: options.body,
      responseType: options.responseType || 'text',
      connectTimeout: 15000,
      readTimeout: 15000,
    });

    return {
      ok: isSuccessStatus(response.status),
      status: response.status,
      data: response.data,
      text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      json: async () => typeof response.data === 'string' ? JSON.parse(response.data) : response.data,
    };
  }

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body,
    });

    return response;
  } catch (err) {
    throw new Error(
      `${err.message}。如果你在浏览器中调试，通常是 WebDAV 服务未允许跨域 CORS；请在 Android/iOS App 中使用，或让服务端允许 PROPFIND/GET/PUT/OPTIONS。`
    );
  }
}

/**
 * 测试 WebDAV 连接
 */
export async function testConnection(config) {
  if (!config?.url || !config?.username || !config?.password) {
    return { ok: false, message: '请填写完整的WebDAV配置' };
  }

  try {
    const url = config.url.replace(/\/+$/, '');
    const resp = await requestWebDav(url, {
      method: 'PROPFIND',
      headers: {
        'Authorization': authHeader(config),
        'Depth': '0',
        'Content-Type': 'application/xml',
      },
      body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>',
      responseType: 'text',
    });

    if (resp.ok || resp.status === 207) {
      return { ok: true, message: '连接成功' };
    } else if (resp.status === 401) {
      return { ok: false, message: '认证失败，请检查用户名和密码' };
    } else {
      return { ok: false, message: `连接失败 (HTTP ${resp.status})` };
    }
  } catch (err) {
    return { ok: false, message: `网络错误: ${err.message}` };
  }
}

/**
 * 上传数据到 WebDAV
 */
export async function uploadData(config, data) {
  const url = buildUrl(config);
  const json = JSON.stringify(data, null, 2);

  const resp = await requestWebDav(url, {
    method: 'PUT',
    headers: {
      'Authorization': authHeader(config),
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: json,
    responseType: 'text',
  });

  if (!resp.ok && resp.status !== 201 && resp.status !== 204) {
    throw new Error(`上传失败 (HTTP ${resp.status})`);
  }

  return { ok: true, timestamp: Date.now() };
}

/**
 * 从 WebDAV 下载数据
 */
export async function downloadData(config) {
  const url = buildUrl(config);

  const resp = await requestWebDav(url, {
    method: 'GET',
    headers: {
      'Authorization': authHeader(config),
    },
    responseType: 'text',
  });

  if (resp.status === 404) {
    // 远端尚无数据文件
    return { ok: true, data: null, notFound: true };
  }

  if (!resp.ok) {
    throw new Error(`下载失败 (HTTP ${resp.status})`);
  }

  const data = await resp.json();
  return { ok: true, data };
}

/**
 * 完整同步逻辑：
 * - 先尝试下载远端数据
 * - 与本地数据合并（以较新的为准）
 * - 上传合并后的数据
 */
export async function syncData(config, localData) {
  // 1. 下载远端
  const remote = await downloadData(config);

  let merged = { ...localData };

  if (remote.data && !remote.notFound) {
    const remoteData = remote.data;

    // 合并 accounts：以本地为准，远端有而本地没有的也保留
    const localIds = new Set((localData.accounts || []).map(a => a.id));
    const remoteOnlyAccounts = (remoteData.accounts || []).filter(a => !localIds.has(a.id));
    merged.accounts = [...(localData.accounts || []), ...remoteOnlyAccounts];

    // 合并 history：逐月合并，每个月内逐账户取较新值
    const mergedHistory = { ...(remoteData.history || {}) };
    for (const [month, data] of Object.entries(localData.history || {})) {
      if (!mergedHistory[month]) {
        mergedHistory[month] = data;
      } else {
        mergedHistory[month] = { ...mergedHistory[month], ...data };
      }
    }
    merged.history = mergedHistory;

    // 合并 updateLog：按 timestamp 去重合并
    const localLogs = localData.updateLog || [];
    const remoteLogs = remoteData.updateLog || [];
    const logMap = new Map();
    [...remoteLogs, ...localLogs].forEach((log) => {
      const key = `${log.accountId}-${log.monthKey}-${log.timestamp}`;
      logMap.set(key, log);
    });
    merged.updateLog = [...logMap.values()].sort((a, b) => a.timestamp - b.timestamp);

    // 时间戳取较大值
    merged.lastModified = Math.max(
      localData.lastModified || 0,
      remoteData.lastModified || 0
    );
  }

  // 更新时间戳
  merged.lastModified = Date.now();

  // 2. 上传合并后的数据
  await uploadData(config, merged);

  return { ok: true, merged };
}
