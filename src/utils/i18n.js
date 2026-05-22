/**
 * 国际化工具 - 支持中英文切换
 */

const translations = {
  zh: {
    // 通用
    app_name: "资产管家",
    confirm: "确定",
    cancel: "取消",
    save: "保存",
    delete: "删除",
    close: "关闭",
    loading: "加载中...",
    add: "添加",

    // 类型
    type_bank: "银行",
    type_fund: "理财",
    type_invest: "投资",

    // 首页
    tab_home: "首页",
    tab_analysis: "分析",
    tab_settings: "设置",
    total_assets: "总资产",
    show: "显示",
    hide: "隐藏",
    asset_trend: "资产趋势",
    recent_months: (n) => `近${n}个月`,
    account_detail: "账户明细",
    update_amount: "更新金额",
    add_account: "添加账户",
    yuan: "元",

    // 趋势变动
    up: "▲",
    down: "▼",

    // 月份选择
    select_month: "选择月份",
    year_suffix: "年",
    month_suffix: "月",
    selected: "已选",

    // 添加账户
    account_name: "账户名称",
    account_name_placeholder: "例：工商银行储蓄卡",
    account_type: "账户类型",
    icon: "图标",
    current_balance: "当前余额（可选）",
    balance_placeholder: "输入当前余额，如 50000",

    // 分析
    analysis: "资产分析",
    click_to_detail: "点击账户查看更新明细",
    month_ratio: "当月资产占比",
    total_records: (n) => `共 ${n} 条更新记录`,
    no_records: "暂无更新记录",

    // 同步
    sync_not_configured: "未配置",
    sync_idle: "未同步",
    sync_syncing: "同步中...",
    sync_success: "已同步",
    sync_error: "同步失败",
    sync_now: "立即同步",
    sync_saved: "WebDAV配置已保存",
    sync_disabled: "已关闭云同步",
    sync_fill_all: "请填写完整的WebDAV配置",

    // 设置
    settings: "设置",
    webdav_sync: "WebDAV 云同步",
    connected: "已连接",
    waiting_sync: "等待同步",
    modify_config: "修改配置",
    config_webdav: "配置WebDAV",
    test_connection: "测试连接",
    save_and_sync: "保存并同步",
    server_url: "服务器地址",
    username: "用户名",
    password: "密码 / 应用密码",
    username_placeholder: "邮箱或用户名",
    password_placeholder: "坚果云请使用应用密码",
    webdav_subtitle: "支持坚果云、NextCloud、Alist 等",
    account_manage: "账户管理",
    add_new_account: "添加新账户",
    testing: "测试连接中...",
    conn_success: "连接成功",

    // 语言
    language_setting: "语言 / Language",
    chinese: "中文",
    english: "English",

    // 提醒
    reminder_setting: "余额更新提醒",
    reminder_desc: "定期提醒您更新账户余额",
    reminder_off: "关闭",
    reminder_monthly: "每月固定日期",
    reminder_interval: "间隔天数",
    reminder_day_of_month: "每月几号提醒",
    reminder_day_suffix: "号",
    reminder_interval_days: "间隔天数",
    reminder_interval_suffix: "天",
    reminder_time: "提醒时间",
    reminder_method: "提醒方式",
    reminder_notification: "应用通知",
    reminder_calendar: "添加到系统日历",
    reminder_save_success: "提醒设置已保存",
    reminder_added_calendar: "已生成日历事件",
    reminder_preview: "下次提醒",

    account_sort: "长按拖动或使用箭头排序",
    move_up: "上移",
    move_down: "下移",

    amount_updated: "金额已更新",
    added_account: (name) => `已添加「${name}」`,
    deleted_account: (name) => `已删除「${name}」`,
    enter_account_name: "请输入账户名称",
    load_timeout: "加载超时，使用默认数据",
  },

  en: {
    app_name: "Asset Manager",
    confirm: "Confirm",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    close: "Close",
    loading: "Loading...",
    add: "Add",

    type_bank: "Bank",
    type_fund: "Fund",
    type_invest: "Invest",

    tab_home: "Home",
    tab_analysis: "Analysis",
    tab_settings: "Settings",
    total_assets: "Total Assets",
    show: "Show",
    hide: "Hide",
    asset_trend: "Asset Trend",
    recent_months: (n) => `Last ${n} months`,
    account_detail: "Accounts",
    update_amount: "Edit",
    add_account: "Add Account",
    yuan: "",

    up: "▲",
    down: "▼",

    select_month: "Select Month",
    year_suffix: "",
    month_suffix: "",
    selected: "Selected",

    account_name: "Account Name",
    account_name_placeholder: "e.g. Savings Account",
    account_type: "Account Type",
    icon: "Icon",
    current_balance: "Balance (optional)",
    balance_placeholder: "Enter balance, e.g. 50000",

    analysis: "Analysis",
    click_to_detail: "Tap account for update history",
    month_ratio: "Asset Allocation",
    total_records: (n) => `${n} records`,
    no_records: "No records yet",

    sync_not_configured: "Not set",
    sync_idle: "Not synced",
    sync_syncing: "Syncing...",
    sync_success: "Synced",
    sync_error: "Sync failed",
    sync_now: "Sync Now",
    sync_saved: "WebDAV config saved",
    sync_disabled: "Cloud sync disabled",
    sync_fill_all: "Please fill in all WebDAV fields",

    settings: "Settings",
    webdav_sync: "WebDAV Cloud Sync",
    connected: "Connected",
    waiting_sync: "Pending",
    modify_config: "Edit Config",
    config_webdav: "Configure WebDAV",
    test_connection: "Test",
    save_and_sync: "Save & Sync",
    server_url: "Server URL",
    username: "Username",
    password: "Password / App Key",
    username_placeholder: "Email or username",
    password_placeholder: "Use app-specific password if needed",
    webdav_subtitle: "Supports Nutstore, NextCloud, Alist, etc.",
    account_manage: "Manage Accounts",
    add_new_account: "Add New Account",
    testing: "Testing...",
    conn_success: "Connected",

    language_setting: "Language / 语言",
    chinese: "中文",
    english: "English",

    reminder_setting: "Balance Reminder",
    reminder_desc: "Remind you to update account balances",
    reminder_off: "Off",
    reminder_monthly: "Monthly (fixed date)",
    reminder_interval: "Every N days",
    reminder_day_of_month: "Day of month",
    reminder_day_suffix: "",
    reminder_interval_days: "Interval",
    reminder_interval_suffix: " days",
    reminder_time: "Reminder time",
    reminder_method: "Method",
    reminder_notification: "Notification",
    reminder_calendar: "Add to Calendar",
    reminder_save_success: "Reminder settings saved",
    reminder_added_calendar: "Calendar event created",
    reminder_preview: "Next reminder",

    account_sort: "Use arrows to reorder accounts",
    move_up: "Up",
    move_down: "Down",

    amount_updated: "Amount updated",
    added_account: (name) => `Added "${name}"`,
    deleted_account: (name) => `Deleted "${name}"`,
    enter_account_name: "Please enter account name",
    load_timeout: "Load timeout, using defaults",
  },
};

export function getTranslations(lang) {
  return translations[lang] || translations.zh;
}

export const SUPPORTED_LANGS = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
];
