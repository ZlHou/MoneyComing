# MoneyComing (Android)

一个离线优先的安卓资产管理应用，支持：
- 账户管理（银行/理财/现金）
- 每月资产录入
- 总资产与月度变化查看
- Room 本地存储
- WebDAV 加密同步（`snapshot.enc`）

## 项目结构

- `app/src/main/java/com/moneycoming/data/model`：数据模型
- `app/src/main/java/com/moneycoming/data/local`：Room DAO / Database
- `app/src/main/java/com/moneycoming/data/repository`：业务仓库
- `app/src/main/java/com/moneycoming/data/sync`：WebDAV + AES-GCM 同步
- `app/src/main/java/com/moneycoming/ui`：Compose 页面和 ViewModel

## 运行

1. 安装 Android Studio Hedgehog+ / Koala+
2. 使用 JDK 17
3. Sync Gradle 后运行 `app`

## WebDAV 同步说明

`SyncWorker` 通过 WorkManager 可接收参数：
- `webdav_url`
- `webdav_username`
- `webdav_password`
- `encryption_secret`
- `device_id`

同步流程：
1. 从 Room 导出快照 JSON
2. AES-GCM 加密
3. 上传到 `moneycoming/snapshot.enc`

