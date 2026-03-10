package com.moneycoming.data.sync

import com.moneycoming.data.model.Account
import com.moneycoming.data.model.MonthlyBalance
import kotlinx.serialization.Serializable

@Serializable
data class SyncPayload(
    val version: Int = 1,
    val deviceId: String,
    val timestamp: Long,
    val accounts: List<AccountDto>,
    val balances: List<MonthlyBalanceDto>
)

@Serializable
data class AccountDto(
    val id: Long,
    val name: String,
    val type: String,
    val currency: String,
    val enabled: Boolean,
    val createdAt: Long,
    val updatedAt: Long
)

@Serializable
data class MonthlyBalanceDto(
    val id: Long,
    val accountId: Long,
    val month: String,
    val amount: Double,
    val note: String,
    val updatedAt: Long
)

fun Account.toDto() = AccountDto(id, name, type, currency, enabled, createdAt, updatedAt)
fun MonthlyBalance.toDto() = MonthlyBalanceDto(id, accountId, month, amount, note, updatedAt)
