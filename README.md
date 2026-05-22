# 资产管家 Asset Manager

个人资产管理 Android 应用，支持 WebDAV 云同步。

## 功能特性

- 📊 多账户资产管理（银行、理财、投资）
- 📈 资产趋势折线图 + 各账户独立走势
- 💰 月度资产对比、涨跌变动展示
- ☁️ WebDAV 云同步（支持坚果云/NextCloud/Alist）
- 💾 本地持久化存储（Capacitor Preferences）
- 🔒 金额隐藏功能
- 📱 Android 原生应用

## 技术栈

- React 18 + Vite 5
- Recharts（图表）
- Capacitor 6（Android 打包）
- Capacitor Preferences（本地存储）

---

## 构建步骤

### 前置要求

- Node.js >= 18
- JDK 17
- Android Studio + Android SDK (API 34)
- 设置好 `JAVA_HOME`、`ANDROID_HOME` 环境变量

### 1. 安装依赖

```bash
npm install
```

### 2. 构建 Web 资源

```bash
npm run build
```

### 3. 初始化 Capacitor（仅首次）

```bash
# 如果还没有 capacitor.config.ts 则执行 init（已包含在项目中，跳过）
npx cap add android
```

### 4. 同步到 Android

```bash
npx cap sync android
```

### 5. 打开 Android Studio 或直接构建 APK

**方式 A：Android Studio**
```bash
npx cap open android
```
然后在 Android Studio 中 Build → Build Bundle(s) / APK(s) → Build APK(s)

**方式 B：命令行构建**
```bash
cd android
# Windows
gradlew.bat assembleDebug
# macOS/Linux
./gradlew assembleDebug
```

APK 位置：`android/app/build/outputs/apk/debug/app-debug.apk`

### 6. 签名发布版 APK（可选）

```bash
cd android

# 生成签名密钥（仅首次）
keytool -genkey -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias release

# 构建 release
gradlew.bat assembleRelease
# 或
./gradlew assembleRelease
```

需要在 `android/app/build.gradle` 中配置 signingConfigs。

---

## WebDAV 配置说明

### 坚果云

- 服务器地址：`https://dav.jianguoyun.com/dav/你的同步文件夹名/`
- 用户名：注册邮箱
- 密码：在坚果云 → 账户信息 → 安全选项 → 第三方应用管理 中生成「应用密码」

### NextCloud

- 服务器地址：`https://your-server.com/remote.php/dav/files/username/sync-folder/`
- 用户名/密码：NextCloud 登录凭据

### Alist

- 服务器地址：`https://your-alist-server.com/dav/path/`
- 用户名/密码：Alist 配置的 WebDAV 凭据

---

## 常见问题

### Windows 编码问题
如果 Gradle 构建报编码错误，在 `android/gradle.properties` 加入：
```
org.gradle.jvmargs=-Dfile.encoding=UTF-8
```

### Capacitor webDir 配置
确保 `capacitor.config.ts` 中 `webDir: 'dist'` 与 Vite 输出目录一致。

### Android SDK 版本
默认 target API 34。如需调整，修改 `android/app/build.gradle` 中的 `compileSdkVersion` 和 `targetSdkVersion`。
