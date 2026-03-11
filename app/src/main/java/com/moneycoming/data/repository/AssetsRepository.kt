package com.moneycoming.data.repository

import com.moneycoming.data.local.AccountDao
import com.moneycoming.data.local.MonthlyBalanceDao
import com.moneycoming.data.model.Account
import com.moneycoming.data.model.MonthlyBalance
import com.moneycoming.data.sync.CryptoManager
import com.moneycoming.data.sync.SyncPayload
import com.moneycoming.data.sync.WebDavClient
import com.moneycoming.data.sync.toDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class AssetsRepository(
    private val accountDao: AccountDao,
    private val monthlyBalanceDao: MonthlyBalanceDao,
    private val json: Json = Json { prettyPrint = true }
) {
    fun observeAccounts() = accountDao.observeEnabledAccounts()

    fun observeMonthlyAccounts(month: String) = monthlyBalanceDao.observeAccountsForMonth(month)

    fun observeMonthlyTotals() = monthlyBalanceDao.observeMonthlyTotals()

    suspend fun addAccount(name: String, type: String) {
        accountDao.insert(Account(name = name, type = type))
    }

    suspend fun upsertMonthlyBalance(accountId: Long, month: String, amount: Double) {
        monthlyBalanceDao.insert(MonthlyBalance(accountId = accountId, month = month, amount = amount))
    }

    suspend fun currentTotal(month: String): Double =
        observeMonthlyAccounts(month).first().sumOf { it.amount }

    suspend fun exportEncryptedSnapshot(
        deviceId: String,
        webDavClient: WebDavClient,
        cryptoManager: CryptoManager,
        remotePath: String = "moneycoming/snapshot.enc"
    ) {
        val payload = SyncPayload(
            deviceId = deviceId,
            timestamp = System.currentTimeMillis(),
            accounts = accountDao.getAll().map { it.toDto() },
            balances = monthlyBalanceDao.getAll().map { it.toDto() }
        )
        val raw = json.encodeToString(payload).toByteArray()
        val encrypted = cryptoManager.encrypt(raw)
        webDavClient.upload(remotePath, encrypted)
    }
}
