package com.moneycoming.data.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.moneycoming.AppContainer

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val baseUrl = inputData.getString("webdav_url") ?: return Result.failure()
        val username = inputData.getString("webdav_username") ?: return Result.failure()
        val password = inputData.getString("webdav_password") ?: return Result.failure()
        val secret = inputData.getString("encryption_secret") ?: return Result.failure()
        val deviceId = inputData.getString("device_id") ?: "android-device"

        return runCatching {
            val repo = AppContainer(applicationContext).repository
            val client = WebDavClient(baseUrl, username, password)
            val crypto = CryptoManager(secret)
            repo.exportEncryptedSnapshot(deviceId, client, crypto)
        }.fold(
            onSuccess = { Result.success() },
            onFailure = { Result.retry() }
        )
    }
}
